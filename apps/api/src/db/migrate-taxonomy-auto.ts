/**
 * Automated Taxonomy Migration (No Prompts)
 * Runs migration automatically without user confirmation
 */

import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

const DB_PATH = path.join(process.cwd(), 'data/pbjs_engine.db');

interface Publisher {
  id: string;
  name: string;
  slug: string;
  domains: string | null;
}

interface Website {
  id: string;
  publisherId: string;
  name: string;
  domain: string;
}

interface AdUnit {
  id: string;
  publisherId: string;
  websiteId: string | null;
  code: string;
  name: string;
}

function runMigration() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  pbjs_engine - Taxonomy Migration                    ║');
  console.log('║  Publisher → Website → Ad Unit Hierarchy             ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  console.log('🚀 Starting taxonomy migration...\n');

  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = OFF'); // Disable FK constraints during migration

  try {
    // Begin transaction
    db.exec('BEGIN TRANSACTION');

    // STEP 1: Get all publishers
    console.log('📊 Step 1: Fetching publishers...');
    const publishers = db.prepare('SELECT id, name, slug, domains FROM publishers WHERE deleted_at IS NULL').all() as Publisher[];
    console.log(`   Found ${publishers.length} publishers\n`);

    // STEP 2: For each publisher, ensure they have at least one website
    console.log('🌐 Step 2: Creating default websites where needed...');
    let websitesCreated = 0;

    for (const publisher of publishers) {
      // Check if publisher has any websites
      const existingWebsites = db.prepare(
        'SELECT COUNT(*) as count FROM websites WHERE publisher_id = ?'
      ).get(publisher.id) as { count: number };

      if (existingWebsites.count === 0) {
        // Create a default website for this publisher
        const websiteId = uuidv4();
        const now = new Date().toISOString();

        // Extract domain from publisher's domains array if available
        let domain = `${publisher.slug}.com`;
        if (publisher.domains) {
          try {
            const domainsArray = JSON.parse(publisher.domains);
            if (Array.isArray(domainsArray) && domainsArray.length > 0) {
              domain = domainsArray[0];
            }
          } catch (e) {
            // Use default domain
          }
        }

        db.prepare(`
          INSERT INTO websites (id, publisher_id, name, domain, status, notes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          websiteId,
          publisher.id,
          `${publisher.name} - Main Website`,
          domain,
          'active',
          'Auto-created during taxonomy migration',
          now,
          now
        );

        websitesCreated++;
        console.log(`   ✅ Created default website for "${publisher.name}" (${domain})`);
      }
    }
    console.log(`   Created ${websitesCreated} default websites\n`);

    // STEP 3: Get all ad units without a website_id
    console.log('📦 Step 3: Migrating orphaned ad units...');
    const orphanedAdUnits = db.prepare(`
      SELECT id, publisher_id as publisherId, website_id as websiteId, code, name
      FROM ad_units
      WHERE website_id IS NULL OR website_id = ''
    `).all() as AdUnit[];

    console.log(`   Found ${orphanedAdUnits.length} ad units without a website\n`);

    let adUnitsUpdated = 0;
    let adUnitsDeleted = 0;
    for (const adUnit of orphanedAdUnits) {
      if (!adUnit.publisherId) {
        // Delete ad units with no publisher (orphaned data)
        db.prepare('DELETE FROM ad_units WHERE id = ?').run(adUnit.id);
        adUnitsDeleted++;
        console.log(`   🗑️  Deleted orphaned ad unit "${adUnit.code}" (no publisher)`);
        continue;
      }

      // Check if publisher exists
      const publisher = db.prepare(
        'SELECT id FROM publishers WHERE id = ? AND deleted_at IS NULL'
      ).get(adUnit.publisherId) as { id: string } | undefined;

      if (!publisher) {
        // Publisher doesn't exist or is deleted - delete this ad unit
        db.prepare('DELETE FROM ad_units WHERE id = ?').run(adUnit.id);
        adUnitsDeleted++;
        console.log(`   🗑️  Deleted ad unit "${adUnit.code}" (publisher doesn't exist)`);
        continue;
      }

      // Find the first website for this publisher (likely the default we just created)
      const website = db.prepare(
        'SELECT id FROM websites WHERE publisher_id = ? LIMIT 1'
      ).get(adUnit.publisherId) as { id: string } | undefined;

      if (website) {
        db.prepare(`
          UPDATE ad_units
          SET website_id = ?, updated_at = ?
          WHERE id = ?
        `).run(website.id, new Date().toISOString(), adUnit.id);

        adUnitsUpdated++;
        console.log(`   ✅ Migrated ad unit "${adUnit.code}" to website`);
      } else {
        console.error(`   ❌ ERROR: No website found for publisher ${adUnit.publisherId}`);
        throw new Error(`Cannot migrate ad unit ${adUnit.id} - no website available`);
      }
    }
    console.log(`   ✅ Updated ${adUnitsUpdated} ad units with website_id`);
    if (adUnitsDeleted > 0) {
      console.log(`   🗑️  Deleted ${adUnitsDeleted} truly orphaned ad units\n`);
    } else {
      console.log('');
    }

    // STEP 4: Verify all ad units now have a website_id
    console.log('✅ Step 4: Verifying data integrity...');
    const stillOrphaned = db.prepare(
      'SELECT COUNT(*) as count FROM ad_units WHERE website_id IS NULL'
    ).get() as { count: number };

    if (stillOrphaned.count > 0) {
      throw new Error(`Migration incomplete: ${stillOrphaned.count} ad units still have null website_id`);
    }
    console.log('   ✅ All ad units have a valid website_id\n');

    // STEP 5: Create new ad_units table without publisher_id
    console.log('🔧 Step 5: Restructuring ad_units table...');

    // Check if publisher_id column exists
    const tableInfo = db.pragma('table_info(ad_units)') as any[];
    const hasPublisherId = tableInfo.some((col: any) => col.name === 'publisher_id');

    if (hasPublisherId) {
      // Create new table with correct schema
      db.exec(`
        CREATE TABLE ad_units_new (
          id TEXT PRIMARY KEY,
          website_id TEXT NOT NULL,
          code TEXT NOT NULL,
          name TEXT NOT NULL,
          media_types TEXT,
          floor_price TEXT,
          targeting TEXT,
          size_mapping TEXT,
          status TEXT NOT NULL DEFAULT 'active',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      // Copy data from old table to new table (excluding publisher_id)
      db.exec(`
        INSERT INTO ad_units_new (
          id, website_id, code, name, media_types, floor_price,
          targeting, size_mapping, status, created_at, updated_at
        )
        SELECT
          id, website_id, code, name, media_types, floor_price,
          targeting, size_mapping, status, created_at, updated_at
        FROM ad_units
      `);

      // Drop old table
      db.exec('DROP TABLE ad_units');

      // Rename new table
      db.exec('ALTER TABLE ad_units_new RENAME TO ad_units');

      console.log('   ✅ ad_units table restructured (publisher_id column removed)\n');
    } else {
      console.log('   ✅ ad_units table already has correct structure\n');
    }

    // STEP 6: Final verification
    console.log('🔍 Step 6: Final verification...');

    const finalPublishers = db.prepare('SELECT COUNT(*) as count FROM publishers WHERE deleted_at IS NULL').get() as { count: number };
    const finalWebsites = db.prepare('SELECT COUNT(*) as count FROM websites').get() as { count: number };
    const finalAdUnits = db.prepare('SELECT COUNT(*) as count FROM ad_units').get() as { count: number };

    console.log(`   📊 Final counts:`);
    console.log(`      Publishers: ${finalPublishers.count}`);
    console.log(`      Websites: ${finalWebsites.count}`);
    console.log(`      Ad Units: ${finalAdUnits.count}\n`);

    // Commit transaction
    db.exec('COMMIT');
    console.log('✅ Migration completed successfully!\n');

    // Print summary
    console.log('📋 SUMMARY:');
    console.log(`   - Created ${websitesCreated} default websites`);
    console.log(`   - Migrated ${adUnitsUpdated} orphaned ad units`);
    console.log(`   - Deleted ${adUnitsDeleted} truly orphaned ad units (no publisher)`);
    console.log(`   - Removed publisher_id column from ad_units`);
    console.log(`   - Enforced website_id as NOT NULL\n`);

    console.log('🎉 Taxonomy is now properly hierarchical: Publisher → Website → Ad Unit\n');

  } catch (error) {
    // Rollback on error
    db.exec('ROLLBACK');
    console.error('\n❌ Migration failed:', error);
    console.error('   Database has been rolled back to previous state\n');
    process.exit(1);
  } finally {
    db.pragma('foreign_keys = ON'); // Re-enable FK constraints
    db.close();
  }
}

// Run migration
runMigration();
