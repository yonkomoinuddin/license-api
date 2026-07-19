const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'licenses.db');

// Simple file-based JSON database (works everywhere, including Railway)
class SimpleDB {
  constructor() {
    this.data = {
      products: [],
      licenses: [],
      logs: []
    };
    this.nextProductId = 1;
    this.nextLicenseId = 1;
    this.nextLogId = 1;
    this.load();
  }

  load() {
    if (fs.existsSync(dbPath)) {
      try {
        this.data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        this.nextProductId = Math.max(...this.data.products.map(p => p.id), 0) + 1;
        this.nextLicenseId = Math.max(...this.data.licenses.map(l => l.id), 0) + 1;
        this.nextLogId = Math.max(...this.data.logs.map(l => l.id), 0) + 1;
      } catch (e) {
        console.error('Error loading database:', e);
      }
    }
  }

  save() {
    fs.writeFileSync(dbPath, JSON.stringify(this.data, null, 2));
  }

  prepare(sql) {
    return new PreparedStatement(sql, this);
  }

  exec(sql) {
    // Not used in our code
  }

  pragma(pragma) {
    // Not used in our code
  }
}

class PreparedStatement {
  constructor(sql, db) {
    this.sql = sql;
    this.db = db;
  }

  run(...params) {
    const sql = this.sql;

    // INSERT INTO products
    if (sql.includes('INSERT INTO products')) {
      const product = {
        id: this.db.nextProductId++,
        product_key: params[0],
        name: params[1],
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
      };
      this.db.data.products.push(product);
      this.db.save();
      return { lastInsertRowid: product.id };
    }

    // INSERT INTO licenses
    if (sql.includes('INSERT INTO licenses')) {
      const license = {
        id: this.db.nextLicenseId++,
        license_key: params[0],
        product_id: params[1],
        customer_name: params[2],
        bound_cidr: params[3],
        status: 'active',
        bound_ip: null,
        last_seen_ip: null,
        last_seen_at: null,
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
      };
      this.db.data.licenses.push(license);
      this.db.save();
      return { lastInsertRowid: license.id };
    }

    // INSERT INTO logs
    if (sql.includes('INSERT INTO logs')) {
      const log = {
        id: this.db.nextLogId++,
        license_id: params[0],
        ip: params[1],
        resource_name: params[2],
        server_hostname: params[3],
        valid: params[4],
        reason: params[5],
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
      };
      this.db.data.logs.push(log);
      this.db.save();
      return { lastInsertRowid: log.id };
    }

    // UPDATE licenses SET bound_ip
    if (sql.includes('UPDATE licenses SET bound_ip')) {
      const licenseId = params[1];
      const license = this.db.data.licenses.find(l => l.id === licenseId);
      if (license) {
        license.bound_ip = params[0];
        this.db.save();
      }
      return {};
    }

    // UPDATE licenses SET last_seen_ip
    if (sql.includes('UPDATE licenses SET last_seen_ip')) {
      const licenseId = params[1];
      const license = this.db.data.licenses.find(l => l.id === licenseId);
      if (license) {
        license.last_seen_ip = params[0];
        license.last_seen_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
        this.db.save();
      }
      return {};
    }

    // UPDATE licenses SET status = 'revoked'
    if (sql.includes("UPDATE licenses SET status = 'revoked'")) {
      const licenseId = params[0];
      const license = this.db.data.licenses.find(l => l.id === licenseId);
      if (license) {
        license.status = 'revoked';
        this.db.save();
      }
      return {};
    }

    // UPDATE licenses SET status = 'active'
    if (sql.includes("UPDATE licenses SET status = 'active'")) {
      const licenseId = params[0];
      const license = this.db.data.licenses.find(l => l.id === licenseId);
      if (license) {
        license.status = 'active';
        this.db.save();
      }
      return {};
    }

    // UPDATE licenses SET bound_ip = NULL
    if (sql.includes('UPDATE licenses SET bound_ip = NULL')) {
      const licenseId = params[0];
      const license = this.db.data.licenses.find(l => l.id === licenseId);
      if (license) {
        license.bound_ip = null;
        this.db.save();
      }
      return {};
    }

    return {};
  }

  get(...params) {
    const sql = this.sql;

    // SELECT * FROM products WHERE product_key
    if (sql.includes('SELECT * FROM products WHERE product_key')) {
      return this.db.data.products.find(p => p.product_key === params[0]);
    }

    // SELECT * FROM licenses WHERE license_key
    if (sql.includes('SELECT * FROM licenses WHERE license_key')) {
      return this.db.data.licenses.find(l => l.license_key === params[0] && l.product_id === params[1]);
    }

    return null;
  }

  all(...params) {
    const sql = this.sql;

    // SELECT * FROM products
    if (sql.includes('SELECT * FROM products ORDER BY created_at DESC')) {
      return [...this.db.data.products].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
    }

    // SELECT licenses.*, products.name
    if (sql.includes('SELECT licenses.*, products.name AS product_name')) {
      return this.db.data.licenses.map(l => {
        const product = this.db.data.products.find(p => p.id === l.product_id);
        return { ...l, product_name: product?.name || 'Unknown' };
      }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    // SELECT * FROM logs WHERE license_id
    if (sql.includes('SELECT * FROM logs WHERE license_id')) {
      return this.db.data.logs
        .filter(l => l.license_id === params[0])
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 100);
    }

    return [];
  }
}

module.exports = new SimpleDB();
