const Database = require('better-sqlite3');
const db = new Database('features.db');
const rows = db.prepare('SELECT id, name FROM features WHERE in_progress = 1').all();
rows.forEach(row => console.log(row.id + ': ' + row.name));
db.close();
