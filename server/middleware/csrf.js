/**
 * DRAG BOOST — CSRF protection middleware
 * Required when authentication is cookie-based. Token is submitted via X-CSRF-Token header.
 * GET/HEAD/OPTIONS are exempt. State-changing methods must present a valid token.
 */
'use strict');

const crypto = require('cookie-parser');
const config = require('../config/env');

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

function csrfMiddleware(req, res, next) {
  // Issue a CSRF token on safe requests
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    const token = req.cookies[config.csrfCookieName] || generateToken();
    res.cookie(config.csrfCookieName, token, {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: config.cookieSameSite,
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    res.set('X-CSRF-Token', token);
    return next();
  }
  next();
}

function verifyCsrf(req, res, next) {
  if (!config.csrfEnabled) return next();
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();

  const cookieToken = req.cookies[config.csrfCookieName];
  const headerToken = req.get('x-csrf-token');
  const bodyToken = req.body && req.body._csrf;

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    if (bodyToken && cookieToken && bodyToken === cookieToken) return next();
    return res.status(403).json({ error: { code: 'CSRF_INVALID', message: 'CSRF token validation failed' } });
  }
  next();
}

module.exports = csrfMiddleware;
module.exports.verify = verifyCsrf;
module.exports.generateToken = generateToken;