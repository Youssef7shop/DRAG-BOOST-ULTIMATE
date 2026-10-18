#!/usr/bin/env node
/**
 * DRAG BOOST — server entry point
 * Bootstrap: env loading, structured logging, Express app, graceful shutdown.
 */
'use strict';

require('dotenv').config();

const { createApp } = require('./app');
const logger = require('./config/logging');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

const app = createApp();

const server = app.listen(PORT, HOST, () => {
  logger.info('DRAG BOOST server started', {
    port: PORT,
    host: HOST,
    env: process.env.NODE_ENV || 'development',
  });
});

function handleShutdown(signal) {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  server.close((err) => {
    if (err) {
      logger.error('Error during server shutdown', { error: err.message });
      process.exit(1);
    }
    logger.info('HTTP server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason: String(reason) });
  process.exit(1);
});

module.exports = server;