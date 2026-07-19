const express = require('express');
const router = express.Router();
const db = require('../db');
const { normalizeIp, isIpInRange } = require('../utils/ip');

function logAttempt(licenseId, ip, resourceName, hostname, valid, reason) {
    db.prepare(
        `INSERT INTO logs (license_id, ip, resource_name, server_hostname, valid, reason)
         VALUES (?, ?, ?, ?, ?, ?)`
    ).run(licenseId, ip, resourceName || 'unknown', hostname || 'unknown', valid ? 1 : 0, reason);
}

// POST /api/validate
// Called by the FiveM licensing-sdk resource on boot and on every heartbeat.
router.post('/validate', (req, res) => {
    const { productKey, licenseKey, resourceName, serverHostname } = req.body || {};
    const requestIp = normalizeIp(req.ip);

    if (!productKey || !licenseKey) {
        return res.json({ valid: false, reason: 'Missing productKey or licenseKey.' });
    }

    const product = db.prepare('SELECT * FROM products WHERE product_key = ?').get(productKey);
    if (!product) {
        return res.json({ valid: false, reason: 'Unknown product key.' });
    }

    const license = db
        .prepare('SELECT * FROM licenses WHERE license_key = ? AND product_id = ?')
        .get(licenseKey, product.id);

    if (!license) {
        logAttempt(null, requestIp, resourceName, serverHostname, false, 'Unknown license key.');
        return res.json({ valid: false, reason: 'Unknown license key.' });
    }

    if (license.status === 'revoked') {
        logAttempt(license.id, requestIp, resourceName, serverHostname, false, 'License revoked.');
        return res.json({ valid: false, reason: 'License has been revoked.' });
    }

    // First successful check ever for this license: auto-bind to the
    // requesting IP. This is what makes leak detection work without the
    // customer having to manually configure their own IP anywhere.
    if (!license.bound_ip) {
        db.prepare('UPDATE licenses SET bound_ip = ? WHERE id = ?').run(requestIp, license.id);
        license.bound_ip = requestIp;
    } else {
        const allowedTarget = license.bound_cidr || license.bound_ip;
        if (!isIpInRange(requestIp, allowedTarget)) {
            logAttempt(
                license.id,
                requestIp,
                resourceName,
                serverHostname,
                false,
                `IP mismatch — bound to ${allowedTarget}, request came from ${requestIp}. Possible leaked script.`
            );
            return res.json({ valid: false, reason: 'This license is bound to a different server.' });
        }
    }

    db.prepare('UPDATE licenses SET last_seen_ip = ?, last_seen_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(requestIp, license.id);
    logAttempt(license.id, requestIp, resourceName, serverHostname, true, 'OK');

    return res.json({ valid: true });
});

module.exports = router;