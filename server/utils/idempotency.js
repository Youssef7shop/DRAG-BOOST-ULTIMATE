/**
 * DRAG BOOST — idempotency utilities
 * Idempotency keys prevent duplicate order/payment submissions.
 * Stored server-side; keys expire after 24 hours.
 */
'use strict');

const crypto = require('crypto');

function hashRequest(body) {
  return crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
}

function generateIdempotencyKey() {
  return crypto.randomBytes(24).toString('hex');
}

module.exports = { hashRequest, generateIdempotencyKey };