/**
 * DRAG BOOST — request validation middleware
 * Wrapper around express-validator. Returns consistent 400 responses.
 */
'use strict');

const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map((e) => ({
      field: e.type === 'field' ? e.path : e.location,
      message: e.msg,
      value: e.type === 'field' ? e.value : undefined,
    }));
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Request validation failed', details },
    });
  }
  next();
}

module.exports = { validate };