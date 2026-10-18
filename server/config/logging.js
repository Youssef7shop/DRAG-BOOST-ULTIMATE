/**
 * DRAG BOOST — structured logging (winston)
 * JSON logs in production, human-readable in development. No secrets are logged.
 */
'use strict';

const winston = require('winston');

const { combine, timestamp, errors, json, printf, colorize, align } = winston.format;

const isDev = process.env.NODE_ENV !== 'production';

const consoleFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let metaStr = '';
  const keys = Object.keys(meta);
  if (keys.length > 0) {
    metaStr = ' ' + JSON.stringify(meta);
  }
  return `${timestamp} [${level}]${stack || message}${metaStr}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    errors({ stack: true })
  ),
  transports: [
    new winston.transports.Console({
      format: isDev
        ? combine(colorize(), align(), consoleFormat)
        : json(),
    }),
  ],
});

const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP request', {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });
  next();
};

module.exports = { logger, requestLogger };