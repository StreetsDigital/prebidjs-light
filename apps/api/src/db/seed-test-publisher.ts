/**
 * Seed Test Publisher with Wrapper Config
 * Creates a complete test publisher with bidders, ad units, and wrapper config
 */

import { v4 as uuidv4 } from 'uuid';
import { db, publishers, publisherConfig, publisherBidders, websites, adUnits, wrapperConfigs, configTargetingRules, sqlite } from './index';
import { eq } from 'drizzle-orm';

async function seedTestPublisher() {
  console.log('🌱 Seeding test publisher with wrapper config...\n');

  let publisherId: string;
  const websiteId = uuidv4();
  const now = new Date().toISOString();

  // 1. Check if Publisher exists, if not create
  console.log('1️⃣  Checking for existing publisher...');
  const existingPublisher = await db
    .select()
    .from(publishers)
    .where(eq(publishers.slug, 'test-publisher'))
    .get();

  if (existingPublisher) {
    publisherId = existingPublisher.id;
    console.log(`✅ Using existing publisher: ${publisherId}`);
  } else {
    publisherId = uuidv4();
    await db.insert(publishers).values({
      id: publisherId,
      name: 'Test Publisher',
      slug: 'test-publisher',
      apiKey: 'test-api-key-' + Math.random().toString(36).substring(7),
      domains: JSON.stringify(['testpublisher.com', 'localhost']),
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }).run();
    console.log(`✅ Publisher created: ${publisherId}`);
  }

  // 2. Create Publisher Config (base config) if not exists
  console.log('\n2️⃣  Checking publisher config...');
  const existingConfig = await db
    .select()
    .from(publisherConfig)
    .where(eq(publisherConfig.publisherId, publisherId))
    .get();

  if (!existingConfig) {
    await db.insert(publisherConfig).values({
      id: uuidv4(),
      publisherId,
      bidderTimeout: 1500,
      priceGranularity: 'medium',
      enableSendAllBids: true,
      bidderSequence: 'random',
      debugMode: false,
      version: 1,
      createdAt: now,
      updatedAt: now,
    }).run();
    console.log('✅ Publisher config created');
  } else {
    console.log('✅ Publisher config exists');
  }

  // 3. Create Bidders if not exist
  console.log('\n3️⃣  Checking bidders...');
  const existingBidders = await db
    .select()
    .from(publisherBidders)
    .where(eq(publisherBidders.publisherId, publisherId))
    .all();

  const bidders = [
    {
      bidderCode: 'appnexus',
      params: { placementId: '13144370' },
      priority: 0,
    },
    {
      bidderCode: 'rubicon',
      params: { accountId: '17282', siteId: '162036', zoneId: '765706' },
      priority: 0,
    },
    {
      bidderCode: 'pubmatic',
      params: { publisherId: '156209', adSlot: '2975135' },
      priority: 5,
    },
  ];

  if (existingBidders.length === 0) {
    for (const bidder of bidders) {
      await db.insert(publisherBidders).values({
        id: uuidv4(),
        publisherId,
        bidderCode: bidder.bidderCode,
        enabled: true,
        params: JSON.stringify(bidder.params),
        priority: bidder.priority,
        createdAt: now,
        updatedAt: now,
      }).run();
    }
    console.log(`✅ ${bidders.length} bidders created`);
  } else {
    console.log(`✅ ${existingBidders.length} bidders exist`);
  }

  // 4. Create Website
  console.log('\n4️⃣  Creating website...');
  await db.insert(websites).values({
    id: websiteId,
    publisherId,
    name: 'Test Website',
    domain: 'testpublisher.com',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }).run();
  console.log(`✅ Website created: ${websiteId}`);

  // 5. Create Ad Units
  console.log('\n5️⃣  Creating ad units...');
  const adUnitsList = [
    {
      code: 'header-banner',
      name: 'Header Banner',
      mediaTypes: {
        banner: {
          sizes: [[728, 90], [970, 90]],
        },
      },
    },
    {
      code: 'sidebar-1',
      name: 'Sidebar Ad 1',
      mediaTypes: {
        banner: {
          sizes: [[300, 250], [300, 600]],
        },
      },
    },
    {
      code: 'sidebar-2',
      name: 'Sidebar Ad 2',
      mediaTypes: {
        banner: {
          sizes: [[300, 250]],
        },
      },
    },
  ];

  // Use raw SQL to insert ad units (database schema still has publisher_id)
  for (const adUnit of adUnitsList) {
    sqlite.prepare(`
      INSERT INTO ad_units (id, publisher_id, website_id, code, name, media_types, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      publisherId,
      websiteId,
      adUnit.code,
      adUnit.name,
      JSON.stringify(adUnit.mediaTypes),
      'active',
      now,
      now
    );
  }
  console.log(`✅ ${adUnitsList.length} ad units created`);

  // 6. Create Default Wrapper Config
  console.log('\n6️⃣  Creating default wrapper config...');
  const defaultConfigId = uuidv4();
  await db.insert(wrapperConfigs).values({
    id: defaultConfigId,
    publisherId,
    name: 'Default Config',
    description: 'Default wrapper configuration for all traffic',
    status: 'active',
    isDefault: true,
    bidderTimeout: 1500,
    priceGranularity: 'medium',
    enableSendAllBids: true,
    bidderSequence: 'random',
    debugMode: true, // Enable debug for testing
    bidders: JSON.stringify(bidders.map(b => ({
      bidderCode: b.bidderCode,
      params: b.params,
    }))),
    adUnits: JSON.stringify({
      'header-banner': adUnitsList[0].mediaTypes,
      'sidebar-1': adUnitsList[1].mediaTypes,
      'sidebar-2': adUnitsList[2].mediaTypes,
    }),
    version: 1,
    createdAt: now,
    updatedAt: now,
  }).run();
  console.log(`✅ Default config created: ${defaultConfigId}`);

  // 7. Create UK Mobile Config (targeted)
  console.log('\n7️⃣  Creating UK Mobile config...');
  const ukMobileConfigId = uuidv4();
  await db.insert(wrapperConfigs).values({
    id: ukMobileConfigId,
    publisherId,
    name: 'UK Mobile Premium',
    description: 'High-value configuration for UK mobile users',
    status: 'active',
    isDefault: false,
    bidderTimeout: 2000,
    priceGranularity: 'high',
    enableSendAllBids: true,
    bidderSequence: 'random',
    debugMode: true,
    bidders: JSON.stringify([
      { bidderCode: 'appnexus', params: { placementId: '13144370' }, timeoutOverride: 1800 },
      { bidderCode: 'rubicon', params: { accountId: '17282', siteId: '162036', zoneId: '765706' } },
      { bidderCode: 'pubmatic', params: { publisherId: '156209', adSlot: '2975135' }, priority: 10 },
    ]),
    adUnits: JSON.stringify({
      'header-banner': adUnitsList[0].mediaTypes,
      'sidebar-1': adUnitsList[1].mediaTypes,
      'sidebar-2': adUnitsList[2].mediaTypes,
    }),
    version: 1,
    createdAt: now,
    updatedAt: now,
  }).run();
  console.log(`✅ UK Mobile config created: ${ukMobileConfigId}`);

  // 8. Create Targeting Rules for UK Mobile Config
  console.log('\n8️⃣  Creating targeting rules...');
  await db.insert(configTargetingRules).values({
    id: uuidv4(),
    configId: ukMobileConfigId,
    publisherId,
    conditions: JSON.stringify([
      { attribute: 'geo', operator: 'equals', value: 'GB' },
      { attribute: 'device', operator: 'equals', value: 'mobile' },
    ]),
    matchType: 'all',
    priority: 100,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  }).run();
  console.log('✅ Targeting rules created (UK + Mobile)');

  // 9. Create US Desktop Config
  console.log('\n9️⃣  Creating US Desktop config...');
  const usDesktopConfigId = uuidv4();
  await db.insert(wrapperConfigs).values({
    id: usDesktopConfigId,
    publisherId,
    name: 'US Desktop Standard',
    description: 'Standard configuration for US desktop users',
    status: 'active',
    isDefault: false,
    bidderTimeout: 1500,
    priceGranularity: 'medium',
    enableSendAllBids: true,
    bidderSequence: 'random',
    debugMode: true,
    bidders: JSON.stringify([
      { bidderCode: 'appnexus', params: { placementId: '13144370' } },
      { bidderCode: 'rubicon', params: { accountId: '17282', siteId: '162036', zoneId: '765706' } },
    ]),
    adUnits: JSON.stringify({
      'header-banner': adUnitsList[0].mediaTypes,
      'sidebar-1': adUnitsList[1].mediaTypes,
      'sidebar-2': adUnitsList[2].mediaTypes,
    }),
    version: 1,
    createdAt: now,
    updatedAt: now,
  }).run();
  console.log(`✅ US Desktop config created: ${usDesktopConfigId}`);

  // 10. Create Targeting Rules for US Desktop Config
  console.log('\n🔟 Creating US Desktop targeting rules...');
  await db.insert(configTargetingRules).values({
    id: uuidv4(),
    configId: usDesktopConfigId,
    publisherId,
    conditions: JSON.stringify([
      { attribute: 'geo', operator: 'equals', value: 'US' },
      { attribute: 'device', operator: 'equals', value: 'desktop' },
    ]),
    matchType: 'all',
    priority: 90,
    enabled: true,
    createdAt: now,
    updatedAt: now,
  }).run();
  console.log('✅ Targeting rules created (US + Desktop)');

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Test Publisher Seeded Successfully!');
  console.log('='.repeat(60));
  console.log('\nPublisher Details:');
  console.log(`  ID: ${publisherId}`);
  console.log(`  Name: Test Publisher`);
  console.log(`  Slug: test-publisher`);
  console.log(`\nWrapper URLs:`);
  console.log(`  Generic: http://localhost:3001/pb/${publisherId}.js`);
  console.log(`  Info: http://localhost:3001/pb/info`);
  console.log(`\nConfigs Created:`);
  console.log(`  1. Default Config (all traffic)`);
  console.log(`  2. UK Mobile Premium (GB + mobile)`);
  console.log(`  3. US Desktop Standard (US + desktop)`);
  console.log(`\nTest URLs:`);
  console.log(`  Test Page: http://localhost:3001/test-wrapper-embedded.html`);
  console.log(`  API Test: ./test-sites-api.sh`);
  console.log(`\nNext Steps:`);
  console.log(`  1. Open test page in browser`);
  console.log(`  2. Enter Publisher ID: ${publisherId}`);
  console.log(`  3. Watch the wrapper load with embedded config!`);
  console.log('\n');
}

seedTestPublisher()
  .then(() => {
    console.log('✅ Seeding complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
