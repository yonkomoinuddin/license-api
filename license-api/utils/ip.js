/**
 * Express/Node sometimes reports IPv4 addresses in IPv4-mapped IPv6 form,
 * e.g. "::ffff:203.0.113.10". Strip that prefix so we compare like-for-like.
 */
function normalizeIp(ip) {
    if (typeof ip === 'string' && ip.startsWith('::ffff:')) {
        return ip.substring(7);
    }
    return ip;
}

function ipToLong(ip) {
    return ip
        .split('.')
        .reduce((acc, octet) => (acc << 8) + (parseInt(octet, 10) & 255), 0) >>> 0;
}

/**
 * Returns true if `ip` matches `target`, where target is either:
 *   - a plain IPv4 address ("203.0.113.10"), or
 *   - a CIDR range ("203.0.113.0/24")
 * IPv4 only (FiveM server hosting is overwhelmingly IPv4).
 */
function isIpInRange(ip, target) {
    if (!ip || !target) return false;

    if (!target.includes('/')) {
        return ip === target;
    }

    const [range, bitsStr] = target.split('/');
    const bits = parseInt(bitsStr, 10);
    if (bits === 0) return true;

    const mask = (~0 << (32 - bits)) >>> 0;
    return (ipToLong(ip) & mask) === (ipToLong(range) & mask);
}

module.exports = { normalizeIp, isIpInRange };