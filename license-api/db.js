const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'licenses.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_key TEXT UNIQUE NOT NULL,
    product_id INTEGER NOT NULL,
    customer_name TEXT,
    status TEXT NOT NULL DEFAULT 'active',      -- 'active' | 'revoked'
    bound_ip TEXT,                               -- auto-set on first successful validation
    bound_cidr TEXT,                              -- optional manual override, e.g. '203.0.113.0/24'
    last_seen_ip TEXT,
    last_seen_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_id INTEGER,
    ip TEXT,
    resource_name TEXT,
    server_hostname TEXT,
    valid INTEGER NOT NULL,
    reason TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

module.exports = db;