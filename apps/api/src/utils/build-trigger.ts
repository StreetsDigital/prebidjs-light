/**
 * Build Trigger Utility
 * Automatically triggers Prebid.js builds when publishers change components
 */

import { v4 as uuidv4 } from 'uuid';
import { db, publisherBuilds, publisherModules, publisherAnalytics, publisherRemovedBidders } from '../db';
import { eq, and } from 'drizzle-orm';
import * as crypto from 'crypto';

/**
 * Generate a config hash based on enabled components
 * This is used to detect if a build is needed
 */
export async function generateComponentHash(publisherId: string): Promise<string> {
  const [modules, analytics, removedBidders] = await Promise.all([
    db.select()
      .from(publisherModules)
      .where(and(
        eq(publisherModules.publisherId, publisherId),
        eq(publisherModules.enabled, true)
      ))
      .all(),

    db.select()
      .from(publisherAnalytics)
      .where(and(
        eq(publisherAnalytics.publisherId, publisherId),
        eq(publisherAnalytics.enabled, true)
      ))
      .all(),

    db.select()
      .from(publisherRemovedBidders)
      .where(eq(publisherRemovedBidders.publisherId, publisherId))
      .all(),
  ]);

  const configData = {
    modules: modules.map(m => m.moduleCode).sort(),
    analytics: analytics.map(a => a.analyticsCode).sort(),
    removedBidders: removedBidders.map(b => b.bidderCode).sort(),
  };

  return crypto.createHash('md5').update(JSON.stringify(configData)).digest('hex').substring(0, 12);
}

/**
 * Check if a build with the same config already exists
 */
export async function buildExists(publisherId: string, configHash: string): Promise<boolean> {
  const existing = db.select()
    .from(publisherBuilds)
    .where(and(
      eq(publisherBuilds.publisherId, publisherId),
      eq(publisherBuilds.configHash, configHash),
      eq(publisherBuilds.status, 'ready')
    ))
    .get();

  return !!existing;
}

/**
 * Trigger a new Prebid.js build for a publisher
 * This is called when components are added/removed/enabled/disabled
 */
export async function triggerPrebidBuild(
  publisherId: string,
  reason: string = 'Component change'
): Promise<{ buildId: string; status: string; cached: boolean }> {
  // Generate config hash
  const configHash = await generateComponentHash(publisherId);

  // Check if we already have a build with this config
  const exists = await buildExists(publisherId, configHash);
  if (exists) {
    console.log(`Build not needed for ${publisherId} - config unchanged (hash: ${configHash})`);
    return {
      buildId: '',
      status: 'cached',
      cached: true,
    };
  }

  // Create build record
  const buildId = uuidv4();
  const now = new Date().toISOString();

  // Get component counts for metadata
  const [modules, analytics] = await Promise.all([
    db.select()
      .from(publisherModules)
      .where(and(
        eq(publisherModules.publisherId, publisherId),
        eq(publisherModules.enabled, true)
      ))
      .all(),

    db.select()
      .from(publisherAnalytics)
      .where(and(
        eq(publisherAnalytics.publisherId, publisherId),
        eq(publisherAnalytics.enabled, true)
      ))
      .all(),
  ]);

  const componentCount = modules.length + analytics.length;
  const modulesIncluded = [
    ...modules.map(m => `module:${m.moduleCode}`),
    ...analytics.map(a => `analytics:${a.analyticsCode}`),
  ];

  db.insert(publisherBuilds).values({
    id: buildId,
    publisherId,
    configHash,
    prebidVersion: '9.0.0', // Latest Prebid.js version
    modulesIncluded: JSON.stringify(modulesIncluded),
    status: 'building',
    createdAt: now,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  }).run();

  console.log(`Build triggered for ${publisherId}: ${buildId} (reason: ${reason})`);

  // Queue async build process
  // Note: In production, this would be a job queue (Bull, BullMQ, etc.)
  queueBuildJob(buildId, publisherId).catch(err => {
    console.error(`Build ${buildId} failed:`, err);
    db.update(publisherBuilds)
      .set({
        status: 'failed',
        // Add errorMessage field if available
      })
      .where(eq(publisherBuilds.id, buildId))
      .run();
  });

  return {
    buildId,
    status: 'building',
    cached: false,
  };
}

/**
 * Queue a build job (async)
 * In production, this would use a proper job queue
 */
async function queueBuildJob(buildId: string, publisherId: string): Promise<void> {
  // Import here to avoid circular dependencies
  const { BuildManagementService } = await import('../services/build-management-service');

  // Delay slightly to simulate async processing
  setTimeout(() => {
    try {
      const build = db.select()
        .from(publisherBuilds)
        .where(eq(publisherBuilds.id, buildId))
        .get();

      if (!build) {
        throw new Error('Build record not found');
      }

      // Process the build
      BuildManagementService.processBuild(
        buildId,
        publisherId,
        build.prebidVersion || '9.0.0'
      );

      console.log(`Build ${buildId} completed successfully`);
    } catch (err) {
      console.error(`Build ${buildId} failed:`, err);
      throw err;
    }
  }, 100); // Small delay to simulate async job
}

/**
 * Helper to trigger build when components change
 * Use this in route handlers after component mutations
 */
export async function triggerBuildIfNeeded(
  publisherId: string,
  action: string
): Promise<void> {
  try {
    const result = await triggerPrebidBuild(publisherId, action);
    if (!result.cached) {
      console.log(`Build queued: ${result.buildId} (${action})`);
    }
  } catch (err) {
    console.error('Failed to trigger build:', err);
    // Don't throw - build failures shouldn't block the mutation
  }
}
