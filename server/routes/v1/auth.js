/**
 * DRAG BOOST — auth routes
 * Registration, login, logout, password recovery. Supabase Auth is the source of truth.
 * Profile rows are created server-side only (service role), never by the client.
 */
'use strict');

const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../../middleware/validation');
const { createClient } = require('@supabase/supabase-js');
const config = require('../../config/env');
const { logger } = require('../../config/logging');

const router = express.Router();

function supabaseAnon() {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function supabaseAdmin() {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// POST /api/v1/auth/register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('full_name').optional().trim().isLength({ max: 100 }),
    body('language').optional().isIn(['ar', 'en', 'fr']),
    body('currency').optional().isIn(['MAD', 'USD', 'EUR']),
  ],
  validate,
  async (req, res) => {
    const { email, password, full_name, language = 'en', currency = 'USD' } = req.body;

    const supabase = supabaseAnon();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name },
        emailRedirectTo: `${config.appUrl}/reset-password.html`,
      },
    });

    if (error) {
      logger.warn('Registration failed', { email, error: error.message });
      return res.status(400).json({
        error: { code: 'REGISTRATION_FAILED', message: error.message || 'Registration failed' },
      });
    }

    if (!data.user) {
      return res.status(500).json({ error: { code: 'REGISTRATION_FAILED', message: 'No user returned' } });
    }

    const admin = supabaseAdmin();
    const { error: profileError } = await admin.from('profiles').insert({
      id: data.user.id,
      email,
      full_name: full_name || null,
      role: 'CUSTOMER',
      status: 'pending_verification',
      language,
      currency,
    });

    if (profileError) {
      logger.error('Profile creation failed', { userId: data.user.id, error: profileError.message });
    }

    res.status(201).json({
      message: 'Registration successful. Please verify your email before logging in.',
      user: { id: data.user.id, email: data.user.email },
    });
  }
);

// POST /api/v1/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  async (req, res) => {
    const { email, password } = req.body;

    const supabase = supabaseAnon();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user || !data.session) {
// POST /api/v1/auth/logout
router.post('/logout', async (req, res) => {
  const token = req.cookies[config.sessionCookieName];
  if (token) {
    try {
      const supabase = supabaseAnon();
      await supabase.auth.setSession({ access_token: token, refresh_token: '' });
      await supabase.auth.signOut();
    } catch (err) {
      // Ignore sign-out errors; cookie is cleared regardless
    }
  }
  res.clearCookie(config.sessionCookieName, { path: '/', sameSite: config.cookieSameSite, secure: config.cookieSecure });
  res.json({ message: 'Logged out' });
});

// POST /api/v1/auth/forgot-password
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  validate,
  async (req, res) => {
    const { email } = req.body;
    const supabase = supabaseAnon();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${config.appUrl}/reset-password.html`,
    });
    if (error) logger.warn('Password reset requested', { email, error: error.message });
    res.json({ message: 'If an account exists, a recovery email has been sent' });
  }
);

// POST /api/v1/auth/reset-password
router.post(
  '/reset-password',
  [
    body('access_token').notEmpty(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validate,
  async (req, res) => {
    const { access_token, password } = req.body;
    const supabase = supabaseAnon();
    const { data, error } = await supabase.auth.updateUser({ password }, { headers: { Authorization: `Bearer ${access_token}` } });
    if (error || !data.user) {
      return res.status(400).json({ error: { code: 'RESET_FAILED', message: error?.message || 'Password reset failed' } });
    }
    res.json({ message: 'Password reset successful. You can now log in.' });
  }
);

module.exports = router;
      logger.warn('Login failed', { email, error: error ? error.message : 'no session' });
      return res.status(401).json({
        error: { code: 'LOGIN_FAILED', message: 'Invalid email or password' },
      });
    }

    const admin = supabaseAdmin();
    const { data: profile } = await admin
      .from('profiles')
      .select('role, status, language, currency')
      .eq('id', data.user.id)
      .single();

    if (!profile || profile.status === 'banned') {
      await supabase.auth.signOut();
      return res.status(403).json({
        error: { code: 'ACCOUNT_RESTRICTED', message: 'Account is restricted or not verified' },
      });
    }

    if (!profile) {
      await admin.from('profiles').insert({
        id: data.user.id,
        email,
        role: 'CUSTOMER',
        status: data.user.email_confirmed_at ? 'active' : 'pending_verification',
        language,
        currency,
      });
    }

    res.cookie(config.sessionCookieName, data.session.access_token, {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: config.cookieSameSite,
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    res.json({
      message: 'Login successful',
      user: {
        id: data.user.id,
        email: data.user.email,
        role: profile ? profile.role : 'CUSTOMER',
        emailVerified: !!data.user.email_confirmed_at,
      },
    });
  }
);