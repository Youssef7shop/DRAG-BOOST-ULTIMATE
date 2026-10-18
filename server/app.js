/**
 * DRAG BOOST — Express application factory
 * Central app configuration: security headers, CORS, parsing, middleware, routes, error handling.
 */
'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');

const config = require('./config/env');
const { logger, requestLogger } = require('./config/logging');
const requestIdMiddleware = require('./middleware/request-id');
const rateLimitMiddleware = require('./middleware/rate-limit');
const authMiddleware = require('./middleware/auth');
const csrfMiddleware = require('./middleware/csrf');
const validationMiddleware = require('./middleware/validation');
const errorHandler = require('./middleware/error-handler');

const healthRouter = require('./routes/v1/health');
const authRouter = require('./routes/v1/auth');
const profileRouter = require('./routes/v1/profile');
const servicesRouter = require('./routes/v1/services');
const ordersRouter = require('./routes/v1/orders');
const transactionsRouter = require('./routes/v1/transactions');
const paymentsRouter = require('./routes/v1/payments');
const ticketsRouter = require('./routes/v1/tickets');
const notificationsRouter = require('./routes/v1/notifications');
const adminRouter = require('./routes/v1/admin');

function createApp() {
  const app = express();

  // Trust proxy (enable when behind a reverse proxy such as Vercel/Render/Nginx)
  app.set('trust proxy', true);

  // Structured request logging
  app.use(requestLogger);

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'", process.env.SUPABASE_URL || 'https://*.supabase.co'],
          frameAncestors: ["'none']",
          baseUri: ["'self']",
          formAction: ["'self']",
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  // Cookie parsing
  app.use(cookieParser());

  // Body parsing with safe size limits
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  // CORS — restricted to configured origins
  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`Not allowed by CORS: ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With'],
      exposedHeaders: [],
      maxAge: 86400,
    })
  );

  // Request ID + global rate limiting
  app.use(requestIdMiddleware);
  app.use(rateLimitMiddleware);

  // Supabase admin client (service role, server-side only) attached to request
  app.use((req, res, next) => {
    req.supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false, autoRefreshToken: false },
      }
    );
    next();
  });

  // Health check (no auth)
  app.use('/api/v1/health', healthRouter);

  // API routes (all require valid Supabase session unless noted in route)
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/profile', authMiddleware.requireAuth, profileRouter);
  app.use('/api/v1/services', authMiddleware.requireAuth, servicesRouter);
  app.use('/api/v1/orders', authMiddleware.requireAuth, ordersRouter);
  app.use('/api/v1/transactions', authMiddleware.requireAuth, transactionsRouter);
  app.use('/api/v1/payments', authMiddleware.requireAuth, paymentsRouter);
  app.use('/api/v1/tickets', authMiddleware.requireAuth, ticketsRouter);
  app.use('/api/v1/notifications', authMiddleware.requireAuth, notificationsRouter);
  app.use('/api/v1/admin', authMiddleware.requireAuth, csrfMiddleware.verify, adminRouter);

  // 404 for unknown API routes
  app.use('/api/v1', (req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'API endpoint not found' } });
  });

  // Centralized error handler (must be last)
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };