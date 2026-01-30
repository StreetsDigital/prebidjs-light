import { db, users } from './index';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

export async function seedSuperAdmin() {
  const adminEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@thenexusengine.com';
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD || 'ChangeMe123!';
  const adminName = process.env.SUPER_ADMIN_NAME || 'Super Admin';

  // Check if super admin already exists
  const existing = db.select().from(users).where(eq(users.email, adminEmail)).get();

  if (existing) {
    console.log(`✓ Super admin already exists: ${adminEmail}`);
    return;
  }

  // Create super admin
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  const now = new Date().toISOString();

  db.insert(users).values({
    id: uuidv4(),
    email: adminEmail,
    passwordHash,
    name: adminName,
    role: 'super_admin',
    status: 'active',
    createdAt: now,
    updatedAt: now,
  }).run();

  console.log(`✓ Super admin created: ${adminEmail}`);
  console.log(`  Password: ${adminPassword}`);
  console.log(`  ⚠️  IMPORTANT: Change this password after first login!`);
}

// Allow running directly
if (require.main === module) {
  seedSuperAdmin()
    .then(() => {
      console.log('Seeding complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}
