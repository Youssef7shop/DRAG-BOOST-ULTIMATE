/**
 * DRAG BOOST — centralized error handler
 * Logs errors (without secrets) and returns consistent JSON error responses.
 * Never exposes stack traces or internal details in production.
 */
'use strict');

const config = require('../config/env');

const isDev = config.nodeEnv !== 'production';

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected error occurred';

  // Log the full error server-side only
  console.error(`[${req.requestId || 'unknown'}] ${statusCode} ${code}: ${message}`);
  if (err.stack && isDev) {
    console.error(err.stack);
  }

  const response = {
    error: {
      code,
      message,
      requestId: req.requestId || null,
    },
  };

  if (isDev && err.stack) {
    response.error.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { errorHandler, AppError };