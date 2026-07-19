const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const db = require('../db');

// Every route below requires: Authorization: Bearer <ADMIN_TOKEN>
router.use((req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';

    if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
});

// ---- Products ---------------------------------------------------------

router.get('/products', (req, res) => {
    res.json(db.prepare('SELECT * FROM products ORDER BY created_at DESC').all());
});

router.post('/products', (req, res) => {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });

    const productKey = 'pk_' + crypto.randomBytes(16).toString('hex');
    const info = db
        .prepare('INSERT INTO products (product_key, name) VALUES (?, ?)')
        .run(productKey, name);

    res.json({ id: info.lastInsertRowid, product_key: productKey, name });
});

// ---- Licenses -----------------------------------------------------------

router.get('/licenses', (req, res) => {
    const licenses = db
        .prepare(
            `SELECT licenses.*, products.name AS product_name
             FROM licenses
             JOIN products ON products.id = licenses.product_id
             ORDER BY licenses.created_at DESC`
        )
        .all();
    res.json(licenses);
});

router.post('/licenses', (req, res) => {
    const { productId, customerName, boundCidr } = req.body || {};
    if (!productId) return res.status(400).json({ error: 'productId is required' });

    const licenseKey = 'lic_' + crypto.randomBytes(20).toString('hex');
    const info = db
        .prepare(
            `INSERT INTO licenses (license_key, product_id, customer_name, bound_cidr)
             VALUES (?, ?, ?, ?)`
        )
        .run(licenseKey, productId, customerName || null, boundCidr || null);

    res.json({ id: info.lastInsertRowid, license_key: licenseKey });
});

router.post('/licenses/:id/revoke', (req, res) => {
    db.prepare(`UPDATE licenses SET status = 'revoked' WHERE id = ?`).run(req.params.id);
    res.json({ ok: true });
});

router.post('/licenses/:id/reactivate', (req, res) => {
    db.prepare(`UPDATE licenses SET status = 'active' WHERE id = ?`).run(req.params.id);
    res.json({ ok: true });
});

// Clears the IP binding so the next validation call re-binds fresh.
// Use this when a customer legitimately moves hosts.
router.post('/licenses/:id/rebind', (req, res) => {
    db.prepare(`UPDATE licenses SET bound_ip = NULL WHERE id = ?`).run(req.params.id);
    res.json({ ok: true });
});

router.get('/licenses/:id/logs', (req, res) => {
    const logs = db
        .prepare('SELECT * FROM logs WHERE license_id = ? ORDER BY created_at DESC LIMIT 100')
        .all(req.params.id);
    res.json(logs);
});

module.exports = router;