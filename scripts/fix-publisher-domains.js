const path = require('path');
const Database = require(path.join(__dirname, '../apps/api/node_modules/better-sqlite3'));

const dbPath = path.join(__dirname, '../apps/api/data/pbjs_engine.db');
const db = new Database(dbPath);

// Get all bulk publishers with non-JSON domains
const publishers = db.prepare("SELECT id, domains FROM publishers WHERE domains LIKE 'bulkdomain%'").all();
console.log('Found', publishers.length, 'publishers to fix');

const update = db.prepare('UPDATE publishers SET domains = ? WHERE id = ?');

const fixDomains = db.transaction(() => {
  for (const pub of publishers) {
    // Convert plain string domain to JSON array
    if (pub.domains && !pub.domains.startsWith('[')) {
      const jsonDomains = JSON.stringify([pub.domains]);
      update.run(jsonDomains, pub.id);
    }
  }
});

fixDomains();

console.log('Fixed domain format for', publishers.length, 'publishers');
db.close();
