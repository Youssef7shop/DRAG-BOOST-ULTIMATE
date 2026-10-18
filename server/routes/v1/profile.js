/**
 * DRAG BOOST — profile routes
 * Customers manage their own profile; staff/admins can inspect profiles.
 */
'use strict');

const express = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../../middleware/validation');
const { requirePermission } = require('../../middleware/auth');

const router = express.Router();

// GET /api/v1/profile — own profile
router.get('/', (req, res) => {
  res.json({ profile: req.auth });
});

// PATCH /api/v1/profile — update own profile (limited fields)
router.patch(
  '/',
  [
    body('full_name').optional().trim().isLength({ max: 100 }),
    body('language').optional().isIn(['ar', 'en', 'fr']),
    body('currency').optional().isIn(['MAD', 'USD', 'EUR']),
  ],
  validate,
  async (req, res) => {
    const allowed = {};
    if (req.body.full_name !== undefined) allowed.full_name = req.body.full_name;
    if (req.body.language !== undefined) allowed.language = req.body.language;
    if (req.body.currency !== undefined) allowed.currency = req.body.currency;
    if (Object.keys(allowed).length === 0) {
      return res.status(400).json({ error: { code: 'NO_FIELDS', message: 'No updatable fields provided' } });
    }

    try {
      const admin = req.supabaseAdmin;
      const { data, error } = await admin
        .from('profiles')
        .update({ ...allowed, updated_at: new Date().toISOString() })
        .eq('id', req.auth.profileId)
        .select('id, email, full_name, role, status, language, currency')
        .single();
      if (error || !data) {
        return res.status(404).json({ error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } });
      }
      res.json({ profile: data });
    } catch (err) {
      res.status(500).json({ error: { code: 'UPDATE_FAILED', message: err.message } });
    }
  }
);

// GET /api/v1/profile/:id — read a profile (staff can read any; customers only their own)
router.get(
  '/:id',
  [param('id').isUUID()],
  validate,
  async (req, res) => {
    const { id } = req.params;
    if (!['ADMIN', 'SUPER_ADMIN', 'SUPPORT'].includes(req.auth.role) && id !== req.auth.userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot read another user profile' } });
    }
    try {
      const { data, error } = await req.supabaseAdmin
        .from('profiles')
        .select('id, email, full_name, role, status, language, currency, created_at')
        .eq('id', id)
        .single();
      if (error || !data) {
        return res.status(404).json({ error: { code: 'PROFILE_NOT_FOUND', message: 'Profile not found' } });
      }
      res.json({ profile: data });
    } catch (err) {
      res.status(500).json({ error: { code: 'FETCH_FAILED', message: err.message } });
    }
  }
);

module.exports = router;