/**
 * DRAG BOOST — request ID middleware
 * Adds a unique request ID to every request for tracing and audit logs.
 */
'use strict';

const crypto = require('crypto');

module.exports = function requestIdMiddleware(req, res, next) {
  const existing = req.get('x-request-id');
  const id = existing && /^[a-zA-Z0-9_-]{1,128}$/.test(existing)
    ? existing
    : crypto.randomBytes(16).toString('hex');
  req.requestId = id;
  res.set('x-request-id', id);
  next();
};