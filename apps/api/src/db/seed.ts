import { db, initializeDatabase, users, publishers, publisherConfig } from './index';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('Initializing database...');
  initializeDatabase();

  console.log('Seeding test data...');

  const now = new Date().toISOString();

  // Check if super admin already exists
  const existingAdmin = db.select().from(users).where(eq(users.email, 'admin@example.com')).get();

  if (!existingAdmin) {
    // Create super admin user
    const adminId = uuidv4();
    const adminPasswordHash = await bcrypt.hash('Admin123!', 10);

    db.insert(users).values({
      id: adminId,
      email: 'admin@example.com',
      passwordHash: adminPasswordHash,
      name: 'Super Admin',
      role: 'super_admin',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }).run();

    console.log('Created super admin: admin@example.com / Admin123!');
  } else {
    console.log('Super admin already exists');
  }

  // Check if test publisher exists
  const existingPublisher = db.select().from(publishers).where(eq(publishers.slug, 'test-publisher')).get();

  let publisherId: string;
  if (!existingPublisher) {
    // Create a test publisher
    publisherId = uuidv4();

    db.insert(publishers).values({
      id: publisherId,
      name: 'Test Publisher',
      slug: 'test-publisher',
      apiKey: `pb_${uuidv4().replace(/-/g, '')}`,
      domains: JSON.stringify(['localhost', 'example.com']),
      status: 'active',
      notes: 'Test publisher for development',
      createdAt: now,
      updatedAt: now,
    }).run();

    console.log('Created test publisher: Test Publisher');

    // Create config for the publisher
    db.insert(publisherConfig).values({
      id: uuidv4(),
      publisherId: publisherId,
      bidderTimeout: 1500,
      priceGranularity: 'medium',
      enableSendAllBids: true,
      bidderSequence: 'random',
      debugMode: false,
      version: 1,
      createdAt: now,
      updatedAt: now,
    }).run();

    console.log('Created publisher config');
  } else {
    publisherId = existingPublisher.id;
    console.log('Test publisher already exists');
  }

  // Check if publisher user exists
  const existingPublisherUser = db.select().from(users).where(eq(users.email, 'publisher@example.com')).get();

  if (!existingPublisherUser) {
    // Create a publisher user
    const publisherUserId = uuidv4();
    const publisherPasswordHash = await bcrypt.hash('Publisher123!', 10);

    db.insert(users).values({
      id: publisherUserId,
      email: 'publisher@example.com',
      passwordHash: publisherPasswordHash,
      name: 'Test Publisher User',
      role: 'publisher',
      publisherId: publisherId,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }).run();

    console.log('Created publisher user: publisher@example.com / Publisher123!');
  } else {
    console.log('Publisher user already exists');
  }

  // Check if admin user exists
  const existingStaffAdmin = db.select().from(users).where(eq(users.email, 'staff@example.com')).get();

  if (!existingStaffAdmin) {
    // Create an admin (staff) user
    const staffId = uuidv4();
    const staffPasswordHash = await bcrypt.hash('Staff123!', 10);

    db.insert(users).values({
      id: staffId,
      email: 'staff@example.com',
      passwordHash: staffPasswordHash,
      name: 'Staff Admin',
      role: 'admin',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }).run();

    console.log('Created staff admin: staff@example.com / Staff123!');
  } else {
    console.log('Staff admin already exists');
  }

  console.log('\nSeed complete! Test credentials:');
  console.log('  Super Admin: admin@example.com / Admin123!');
  console.log('  Staff Admin: staff@example.com / Staff123!');
  console.log('  Publisher:   publisher@example.com / Publisher123!');
}

seed().catch(console.error);
