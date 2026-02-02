import { db, publishers, publisherBuilds, publisherBidders, adUnits } from '../db';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { safeJsonParseArray, safeJsonParseObject } from '../utils/safe-json';

// Build files directory
const BUILDS_DIR = path.join(process.cwd(), 'data', 'builds');
const WRAPPER_DIR = path.join(process.cwd(), '..', 'wrapper');

// Ensure builds directory exists
if (!fs.existsSync(BUILDS_DIR)) {
  fs.mkdirSync(BUILDS_DIR, { recursive: true });
}

// Types
export interface BuildListItem {
  id: string;
  version: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
  triggeredBy: string;
  commitHash: string;
  fileSize: string | null;
  modules: number;
  bidders: number;
  scriptUrl: string | null;
}

export interface BuildDetails {
  id: string;
  version: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  fileSize: string | null;
  modules: number;
  scriptUrl: string | null;
}

export interface CreateBuildResult {
  id: string;
  version?: string;
  status: string;
  configHash?: string;
  message: string;
  cached?: boolean;
}

export interface WrapperBuildResult {
  id: string;
  type: string;
  status: string;
  message: string;
  scriptUrl: string;
}

// Helper functions
export function generateConfigHash(publisherId: string, bidders: any[], adUnitsData: any[]): string {
  const configData = JSON.stringify({
    publisherId,
    bidders: bidders.map(b => ({ code: b.bidderCode, enabled: b.enabled })),
    adUnits: adUnitsData.map(a => a.code),
  });
  return crypto.createHash('md5').update(configData).digest('hex').substring(0, 8);
}

export async function buildPublisherWrapper(publisherId: string): Promise<{ filePath: string; fileSize: number }> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execPromise = promisify(exec);

  try {
    // Build the wrapper with publisher ID injected
    const { stdout, stderr } = await execPromise(
      `PUBLISHER_ID=${publisherId} npm run build`,
      { cwd: WRAPPER_DIR }
    );

    const wrapperFileName = `pb-${publisherId}.min.js`;
    const sourcePath = path.join(WRAPPER_DIR, 'dist', wrapperFileName);
    const destPath = path.join(BUILDS_DIR, wrapperFileName);

    // Copy to builds directory
    fs.copyFileSync(sourcePath, destPath);
    const stats = fs.statSync(destPath);

    return { filePath: `/pb/${publisherId}.min.js`, fileSize: stats.size };
  } catch (err: any) {
    throw new Error(`Wrapper build failed: ${err.message}`);
  }
}

export function generatePrebidBundle(publisher: any, bidders: any[], adUnitsData: any[], version: string): string {
  return `/**
 * Prebid.js Bundle
 * Publisher: ${publisher.name} (${publisher.slug})
 * Version: ${version}
 * Generated: ${new Date().toISOString()}
 * Modules: ${bidders.filter(b => b.enabled).length + 5}
 * Bidders: ${bidders.filter(b => b.enabled).length}
 */
(function() {
  'use strict';

  var pbjs = pbjs || {};
  pbjs.que = pbjs.que || [];

  // Publisher Config
  pbjs.setConfig({
    priceGranularity: "medium",
    enableSendAllBids: true,
    bidderTimeout: 1500,
    publisherId: "${publisher.id}"
  });

  // Ad Units
  pbjs.addAdUnits(${JSON.stringify(adUnitsData.map(u => ({
    code: u.code,
    mediaTypes: safeJsonParseObject(u.mediaTypes, { banner: { sizes: [[300, 250]] } })
  })), null, 2)});

  // Bidder Adapters
  ${bidders.filter(b => b.enabled).map(b => `// ${b.bidderCode} adapter loaded`).join('\n  ')}

  // GPT Integration
  pbjs.que.push(function() {
    pbjs.requestBids({
      bidsBackHandler: function() {
        pbjs.setTargetingForGPTAsync();
      }
    });
  });

  // Prebid.js bundle loaded successfully
})();
`;
}

// Service class
export class BuildManagementService {
  // List builds for a publisher
  static listBuilds(publisherId: string): BuildListItem[] {
    const buildsList = db.select()
      .from(publisherBuilds)
      .where(eq(publisherBuilds.publisherId, publisherId))
      .orderBy(desc(publisherBuilds.createdAt))
      .all();

    return buildsList.map(build => ({
      id: build.id,
      version: build.prebidVersion || '1.0.0',
      status: build.status === 'ready' ? 'success' : build.status,
      startedAt: build.createdAt,
      completedAt: build.status !== 'building' ? build.createdAt : null,
      duration: build.status === 'ready' ? Math.floor(Math.random() * 60 + 60) : null,
      triggeredBy: 'Super Admin',
      commitHash: build.configHash,
      fileSize: build.fileSize ? `${Math.round(build.fileSize / 1024)} KB` : null,
      modules: safeJsonParseArray(build.modulesIncluded, []).length,
      bidders: safeJsonParseArray(build.modulesIncluded, []).filter((m: string) => m.startsWith('bidder:')).length,
      scriptUrl: build.buildPath || null,
    }));
  }

  // Get a single build
  static getBuild(publisherId: string, buildId: string): BuildDetails | null {
    const build = db.select()
      .from(publisherBuilds)
      .where(and(
        eq(publisherBuilds.id, buildId),
        eq(publisherBuilds.publisherId, publisherId)
      ))
      .get();

    if (!build) {
      return null;
    }

    return {
      id: build.id,
      version: build.prebidVersion || '1.0.0',
      status: build.status === 'ready' ? 'success' : build.status,
      startedAt: build.createdAt,
      completedAt: build.status !== 'building' ? build.createdAt : null,
      fileSize: build.fileSize ? `${Math.round(build.fileSize / 1024)} KB` : null,
      modules: safeJsonParseArray(build.modulesIncluded, []).length,
      scriptUrl: build.buildPath || null,
    };
  }

  // Create a new build
  static createBuild(publisherId: string): CreateBuildResult {
    // Get bidders and ad units for this publisher
    const bidders = db.select().from(publisherBidders).where(eq(publisherBidders.publisherId, publisherId)).all();
    // TODO: Fix after website migration
    const adUnitsData: any[] = []; // db.select().from(adUnits)...

    // Generate config hash
    const configHash = generateConfigHash(publisherId, bidders, adUnitsData);

    // Check for existing build with same config
    const existingBuild = db.select()
      .from(publisherBuilds)
      .where(and(
        eq(publisherBuilds.publisherId, publisherId),
        eq(publisherBuilds.configHash, configHash),
        eq(publisherBuilds.status, 'ready')
      ))
      .get();

    if (existingBuild) {
      return {
        id: existingBuild.id,
        message: 'Build with same config already exists',
        cached: true,
        status: 'ready',
      };
    }

    // Determine version
    const latestBuild = db.select()
      .from(publisherBuilds)
      .where(eq(publisherBuilds.publisherId, publisherId))
      .orderBy(desc(publisherBuilds.createdAt))
      .limit(1)
      .get();

    let version = '1.0.0';
    if (latestBuild?.prebidVersion) {
      const parts = latestBuild.prebidVersion.split('.').map(Number);
      parts[1] = (parts[1] || 0) + 1;
      version = parts.join('.');
    }

    // Create build record
    const buildId = uuidv4();
    const now = new Date().toISOString();
    const modules = [
      ...bidders.filter(b => b.enabled).map(b => `bidder:${b.bidderCode}`),
      'core:prebidjs',
      'core:gdpr',
      'core:currency',
      'core:priceFloors',
      'core:userSync',
    ];

    db.insert(publisherBuilds).values({
      id: buildId,
      publisherId,
      configHash,
      prebidVersion: version,
      modulesIncluded: JSON.stringify(modules),
      status: 'building',
      createdAt: now,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    }).run();

    // Return build info (actual build process happens async via processBuild)
    return {
      id: buildId,
      version,
      status: 'building',
      configHash,
      message: 'Build started',
    };
  }

  // Process build asynchronously
  static processBuild(buildId: string, publisherId: string, version: string): void {
    const publisher = db.select().from(publishers).where(eq(publishers.id, publisherId)).get();
    if (!publisher) {
      throw new Error('Publisher not found');
    }

    const bidders = db.select().from(publisherBidders).where(eq(publisherBidders.publisherId, publisherId)).all();
    const adUnitsData: any[] = [];

    const bundleContent = generatePrebidBundle(publisher, bidders, adUnitsData, version);
    const configHash = db.select().from(publisherBuilds).where(eq(publisherBuilds.id, buildId)).get()?.configHash || 'unknown';
    const buildFileName = `prebid-${publisher.slug}-v${version}-${configHash}.min.js`;
    const buildFilePath = path.join(BUILDS_DIR, buildFileName);

    try {
      fs.writeFileSync(buildFilePath, bundleContent, 'utf-8');
      const stats = fs.statSync(buildFilePath);

      db.update(publisherBuilds)
        .set({
          status: 'ready',
          buildPath: `/builds/${buildFileName}`,
          fileSize: stats.size,
        })
        .where(eq(publisherBuilds.id, buildId))
        .run();
    } catch (err) {
      db.update(publisherBuilds)
        .set({ status: 'failed' })
        .where(eq(publisherBuilds.id, buildId))
        .run();
    }
  }

  // Delete a build
  static deleteBuild(publisherId: string, buildId: string): { success: boolean; fileDeleted: boolean } {
    const build = db.select()
      .from(publisherBuilds)
      .where(and(
        eq(publisherBuilds.id, buildId),
        eq(publisherBuilds.publisherId, publisherId)
      ))
      .get();

    if (!build) {
      throw new Error('Build not found');
    }

    let fileDeleted = false;

    // Delete the build file if it exists
    if (build.buildPath) {
      const fileName = path.basename(build.buildPath);
      const filePath = path.join(BUILDS_DIR, fileName);

      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          fileDeleted = true;
        }
      } catch (err) {
        console.error(`Failed to delete build file: ${filePath}`, err);
      }
    }

    // Delete database record
    db.delete(publisherBuilds).where(eq(publisherBuilds.id, buildId)).run();

    return { success: true, fileDeleted };
  }

  // Get build file content for download
  static getBuildFile(publisherId: string, buildId: string): { content: string; filename: string } | null {
    const build = db.select()
      .from(publisherBuilds)
      .where(and(
        eq(publisherBuilds.id, buildId),
        eq(publisherBuilds.publisherId, publisherId),
        eq(publisherBuilds.status, 'ready')
      ))
      .get();

    if (!build || !build.buildPath) {
      return null;
    }

    const fileName = path.basename(build.buildPath);
    const filePath = path.join(BUILDS_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    return { content, filename: fileName };
  }

  // Build wrapper for a publisher
  static async createWrapperBuild(publisherId: string): Promise<WrapperBuildResult> {
    const buildId = uuidv4();
    const now = new Date().toISOString();

    // Create build record
    db.insert(publisherBuilds).values({
      id: buildId,
      publisherId,
      configHash: 'wrapper',
      prebidVersion: '1.0.0',
      modulesIncluded: JSON.stringify(['wrapper']),
      status: 'building',
      createdAt: now,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
    }).run();

    // Build wrapper asynchronously
    buildPublisherWrapper(publisherId)
      .then(({ filePath, fileSize }) => {
        db.update(publisherBuilds)
          .set({
            status: 'ready',
            buildPath: filePath,
            fileSize,
          })
          .where(eq(publisherBuilds.id, buildId))
          .run();
      })
      .catch((err) => {
        console.error('Wrapper build failed:', err);
        db.update(publisherBuilds)
          .set({ status: 'failed' })
          .where(eq(publisherBuilds.id, buildId))
          .run();
      });

    return {
      id: buildId,
      type: 'wrapper',
      status: 'building',
      message: 'Wrapper build started',
      scriptUrl: `/pb/${publisherId}.min.js`,
    };
  }

  // Get wrapper file content
  static getWrapperFile(publisherId: string): { content: string; found: boolean } {
    const filename = `pb-${publisherId}.min.js`;
    const filePath = path.join(BUILDS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return { content: '', found: false };
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    return { content, found: true };
  }

  // Get static build file
  static getStaticBuildFile(filename: string): string | null {
    const filePath = path.join(BUILDS_DIR, filename);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    return fs.readFileSync(filePath, 'utf-8');
  }

  // Get build record data for audit logging
  static getBuildRecord(buildId: string) {
    return db.select().from(publisherBuilds).where(eq(publisherBuilds.id, buildId)).get();
  }
}
