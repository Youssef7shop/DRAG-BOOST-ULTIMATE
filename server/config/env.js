/**
 * DRAG BOOST — environment configuration
 * Centralized, validated env access. No secrets are logged.
 */
'use strict';

const dotenv = require('dotenv');
dotenv.config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name, defaultValue) {
  return process.env[name] !== undefined ? process.env[name] : defaultValue;
}

function parseBool(name, defaultValue) {
  const raw = optional(name, String(defaultValue));
  return /^(true|1|yes)$/i.test(raw);
}

const config = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: parseInt(optional('PORT', '3000'), 10),
  host: optional('HOST', '0.0.0.0'),
  appUrl: optional('APP_URL', 'http://localhost:3000'),
  frontendUrl: optional('FRONTEND_URL', 'http://localhost:3000'),
  appName: optional('APP_NAME', 'DRAG BOOST'),

  supabaseUrl: required('SUPABASE_URL'),
  supabaseAnonKey: required('SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  supabaseJwtSecret: optional('SUPABASE_JWT_SECRET'),

  sessionCookieName: optional('SESSION_COOKIE_NAME', 'sb_session'),
  csrfCookieName: optional('CSRF_COOKIE_NAME', 'csrf_token'),
  csrfEnabled: parseBool('CSRF_ENABLED', true),
  cookieSecure: parseBool('COOKIE_SECURE', false),
  cookieSameSite: optional('COOKIE_SAME_SITE', 'Lax'),

  corsAllowedOrigins: optional('CORS_ALLOWED_ORIGINS', '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  rateLimitWindowMs: parseInt(optional('RATE_LIMIT_WINDOW_MS', '900000'), 10),
  rateLimitMaxRequests: parseInt(optional('RATE_LIMIT_MAX_REQUESTS', '100'), 10),
  authRateLimitMaxRequests: parseInt(optional('AUTH_RATE_LIMIT_MAX_REQUESTS', '10'), 10),

  logLevel: optional('LOG_LEVEL', 'info'),

  stripeSecretKey: optional('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: optional('STRIPE_WEBHOOK_SECRET'),
  stripePublishableKey: optional('STRIPE_PUBLISHABLE_KEY'),

  providerApiKey: optional('PROVIDER_API_KEY'),
  providerApiSecret: optional('PROVIDER_API_SECRET'),
  providerBaseUrl: optional('PROVIDER_BASE_URL'),

  googleClientId: optional('GOOGLE_CLIENT_ID'),
  googleClientSecret: optional('GOOGLE_CLIENT_SECRET'),

  // Supported transaction currencies (ISO 4217). Original currency preserved per order/transaction.
  supportedCurrencies: ['MAD', 'USD', 'EUR'],
};

module.exports = config;