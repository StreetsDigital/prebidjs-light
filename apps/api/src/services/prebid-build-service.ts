import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import { db } from '../db/index.js';
import { publisherModules, publisherAnalytics, publisherRemovedBidders } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

const PREBID_SOURCE_DIR = path.join(__dirname, '../../prebid-builds/prebid-source');
const BUILDS_OUTPUT_DIR = path.join(__dirname, '../../prebid-builds/output');

interface BuildOptions {
  publisherId: string;
  buildId: string;
  onProgress?: (progress: number, message: string) => void;
}

interface BuildResult {
  success: boolean;
  cdnUrl?: string;
  fileSize?: number;
  errorMessage?: string;
}

/**
 * Get all enabled Prebid.js modules for a publisher
 */
async function getEnabledModules(publisherId: string): Promise<string[]> {
  const modules = await db
    .select()
    .from(publisherModules)
    .where(
      and(
        eq(publisherModules.publisherId, publisherId),
        eq(publisherModules.enabled, true)
      )
    )
    .all();

  return modules.map(m => m.moduleCode);
}

/**
 * Get all enabled analytics adapters for a publisher
 */
async function getEnabledAnalytics(publisherId: string): Promise<string[]> {
  const analytics = await db
    .select()
    .from(publisherAnalytics)
    .where(
      and(
        eq(publisherAnalytics.publisherId, publisherId),
        eq(publisherAnalytics.enabled, true)
      )
    )
    .all();

  return analytics.map(a => a.analyticsCode);
}

/**
 * Get all bidders that should be EXCLUDED from the build
 * (bidders in removed_bidders table should NOT be included)
 */
async function getRemovedBidders(publisherId: string): Promise<string[]> {
  const removed = await db
    .select()
    .from(publisherRemovedBidders)
    .where(eq(publisherRemovedBidders.publisherId, publisherId))
    .all();

  return removed.map(b => b.bidderCode);
}

/**
 * Build the complete module list for Prebid.js compilation
 * Includes: enabled modules + enabled analytics + all bidders EXCEPT removed ones
 */
async function buildModuleList(publisherId: string): Promise<string[]> {
  const [enabledModules, enabledAnalytics, removedBidders] = await Promise.all([
    getEnabledModules(publisherId),
    getEnabledAnalytics(publisherId),
    getRemovedBidders(publisherId),
  ]);

  // Fetch all available bidders from the source
  const biddersDir = path.join(PREBID_SOURCE_DIR, 'modules');
  let allBidderModules: string[] = [];

  try {
    const files = await fs.readdir(biddersDir);
    // Get full module names like "rubiconBidAdapter", "appnexusBidAdapter"
    allBidderModules = files
      .filter(f => f.endsWith('BidAdapter.js'))
      .map(f => f.replace('.js', '')); // Keep full name including "BidAdapter"
  } catch (err) {
    console.error('Failed to read bidders directory:', err);
  }

  // Convert removed bidder codes (like "rubicon") to full module names (like "rubiconBidAdapter")
  const removedBidderModules = removedBidders.map(code => `${code}BidAdapter`);

  // Include all bidders EXCEPT the ones in removedBidders
  const includedBidders = allBidderModules.filter(
    module => !removedBidderModules.includes(module)
  );

  // Combine all modules: bidders + modules + analytics
  const allModules = [
    ...includedBidders,
    ...enabledModules,
    ...enabledAnalytics,
  ];

  // Remove duplicates
  return Array.from(new Set(allModules));
}

/**
 * Execute the Prebid.js build using Gulp
 */
async function executeBuild(
  modules: string[],
  outputFileName: string,
  options: BuildOptions
): Promise<BuildResult> {
  const { onProgress } = options;

  // Create output directory if it doesn't exist
  await fs.mkdir(BUILDS_OUTPUT_DIR, { recursive: true });

  const outputPath = path.join(BUILDS_OUTPUT_DIR, outputFileName);

  // Prepare the gulp command
  // Use build-bundle-prod for complete production build with all setup
  const moduleList = modules.join(',');
  const args = ['build-bundle-prod', '--modules', moduleList];

  return new Promise((resolve) => {
    if (onProgress) {
      onProgress(10, 'Starting build process...');
    }

    const buildProcess = spawn('npx', ['gulp', ...args], {
      cwd: PREBID_SOURCE_DIR,
      env: { ...process.env },
      shell: true,
    });

    let stdout = '';
    let stderr = '';
    let progressCounter = 10;

    buildProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;

      // Update progress based on build output
      if (output.includes('Starting')) {
        progressCounter = Math.min(progressCounter + 10, 40);
        if (onProgress) onProgress(progressCounter, 'Compiling modules...');
      } else if (output.includes('Finished')) {
        progressCounter = 80;
        if (onProgress) onProgress(progressCounter, 'Finalizing build...');
      }
    });

    buildProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    buildProcess.on('close', async (code) => {
      if (code !== 0) {
        console.error('Build failed:', stderr);
        resolve({
          success: false,
          errorMessage: `Build process exited with code ${code}: ${stderr}`,
        });
        return;
      }

      try {
        // The Prebid build outputs to build/dist/prebid.js by default
        const defaultOutputPath = path.join(PREBID_SOURCE_DIR, 'build/dist/prebid.js');

        // Move the built file to our output directory
        await fs.copyFile(defaultOutputPath, outputPath);

        // Get file size
        const stats = await fs.stat(outputPath);
        const fileSize = stats.size;

        if (onProgress) {
          onProgress(100, 'Build complete!');
        }

        // In production, this would be uploaded to CDN
        // For now, we'll serve it from our API
        const cdnUrl = `/builds/${outputFileName}`;

        resolve({
          success: true,
          cdnUrl,
          fileSize,
        });
      } catch (err) {
        console.error('Failed to copy build output:', err);
        resolve({
          success: false,
          errorMessage: `Failed to process build output: ${(err as Error).message}`,
        });
      }
    });

    buildProcess.on('error', (err) => {
      console.error('Build process error:', err);
      resolve({
        success: false,
        errorMessage: `Build process error: ${err.message}`,
      });
    });
  });
}

/**
 * Generate a unique build filename
 */
function generateBuildFilename(publisherId: string, version: string): string {
  const timestamp = Date.now();
  return `prebid-${publisherId}-${version}-${timestamp}.js`;
}

/**
 * Main build function - orchestrates the entire build process
 */
export async function buildPrebidJs(options: BuildOptions): Promise<BuildResult> {
  const { publisherId, onProgress } = options;

  try {
    if (onProgress) {
      onProgress(5, 'Gathering enabled modules...');
    }

    // Get module list from database
    const modules = await buildModuleList(publisherId);

    if (modules.length === 0) {
      return {
        success: false,
        errorMessage: 'No modules enabled for this publisher',
      };
    }

    console.log(`Building Prebid.js with ${modules.length} modules for publisher ${publisherId}`);

    // Generate version number (in production, this would be semantic versioning)
    const version = '1.0.0';
    const filename = generateBuildFilename(publisherId, version);

    // Execute the build
    const result = await executeBuild(modules, filename, options);

    return result;
  } catch (err) {
    console.error('Build failed:', err);
    return {
      success: false,
      errorMessage: `Build failed: ${(err as Error).message}`,
    };
  }
}

/**
 * Get the file size of a build
 */
export async function getBuildFileSize(filename: string): Promise<number> {
  const filepath = path.join(BUILDS_OUTPUT_DIR, filename);
  const stats = await fs.stat(filepath);
  return stats.size;
}

/**
 * Serve a build file
 */
export async function getBuildFile(filename: string): Promise<Buffer> {
  const filepath = path.join(BUILDS_OUTPUT_DIR, filename);
  return await fs.readFile(filepath);
}

/**
 * Delete old build files (cleanup)
 */
export async function cleanupOldBuilds(publisherId: string, keepCount: number = 5): Promise<void> {
  const files = await fs.readdir(BUILDS_OUTPUT_DIR);
  const publisherBuilds = files
    .filter(f => f.startsWith(`prebid-${publisherId}-`))
    .map(f => ({
      name: f,
      path: path.join(BUILDS_OUTPUT_DIR, f),
    }));

  // Sort by modification time (newest first)
  const sorted = await Promise.all(
    publisherBuilds.map(async (build) => ({
      ...build,
      mtime: (await fs.stat(build.path)).mtime,
    }))
  );

  sorted.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  // Delete old builds beyond keepCount
  const toDelete = sorted.slice(keepCount);
  await Promise.all(toDelete.map(build => fs.unlink(build.path)));

  if (toDelete.length > 0) {
    console.log(`Cleaned up ${toDelete.length} old builds for publisher ${publisherId}`);
  }
}
