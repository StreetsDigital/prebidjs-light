/**
 * Build Prebid.js bundles for all publishers
 * Run this script after deployment to generate initial builds
 *
 * Usage:
 *   npx tsx scripts/build-all-publishers.ts
 */

import { db, publishers } from '../src/db';
import { triggerPrebidBuild } from '../src/utils/build-trigger';

async function buildAllPublishers() {
  console.log('🚀 Building Prebid.js bundles for all publishers...\n');

  const allPublishers = db.select().from(publishers).all();

  console.log(`Found ${allPublishers.length} publishers\n`);

  for (const publisher of allPublishers) {
    console.log(`Building for: ${publisher.name} (${publisher.slug})`);

    try {
      const result = await triggerPrebidBuild(publisher.id, 'Initial build');

      if (result.cached) {
        console.log(`  ✓ Build already exists (cached)`);
      } else {
        console.log(`  ✓ Build queued: ${result.buildId}`);
      }
    } catch (error: any) {
      console.error(`  ✗ Build failed: ${error.message}`);
    }

    console.log('');
  }

  console.log('✅ All builds queued successfully!');
  console.log('Builds will complete in the background.');
  console.log('\nCheck build status:');
  console.log('  GET /api/publishers/:publisherId/builds');
}

// Run script
buildAllPublishers()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
