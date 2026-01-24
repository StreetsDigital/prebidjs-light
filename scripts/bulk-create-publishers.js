const path = require('path');
const Database = require(path.join(__dirname, '../apps/api/node_modules/better-sqlite3'));
const crypto = require('crypto');

const dbPath = path.join(__dirname, '../apps/api/data/pbjs_engine.db');
const db = new Database(dbPath);

// Get current count
const currentCount = db.prepare('SELECT COUNT(*) as count FROM publishers').get();
console.log('Current publisher count:', currentCount.count);

const targetCount = 1000;
const needed = targetCount - currentCount.count;

if (needed <= 0) {
  console.log('Already have', currentCount.count, 'publishers. No need to create more.');
  db.close();
  process.exit(0);
}

console.log('Creating', needed, 'publishers...');

const insert = db.prepare(`
  INSERT INTO publishers (id, name, slug, api_key, domains, status, notes, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const generateUUID = () => {
  return crypto.randomUUID();
};

const generateApiKey = () => {
  return 'pb_' + crypto.randomBytes(16).toString('hex');
};

const now = new Date().toISOString();

const insertMany = db.transaction((count) => {
  for (let i = 0; i < count; i++) {
    const num = currentCount.count + i + 1;
    const id = generateUUID();
    const name = `Bulk Publisher ${num}`;
    const slug = `bulk-publisher-${num}`;
    const apiKey = generateApiKey();
    const domains = `bulkdomain${num}.com`;

    insert.run(id, name, slug, apiKey, domains, 'active', '', now, now);
  }
});

insertMany(needed);

const newCount = db.prepare('SELECT COUNT(*) as count FROM publishers').get();
console.log('New publisher count:', newCount.count);

db.close();
console.log('Done!');
