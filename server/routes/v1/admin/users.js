/**
 * DRAG BOOST — admin user management
 * Role changes are server-side only; customers cannot self-assign roles.
 */
'use strict');

const express = require('express');
const { body, param, query } = require('express-validator');
const { validate } = require('../../middleware/validation');
const { requireAuth, requireRole, requirePermission } = require('../../middleware/auth');

const router = express.Router();

// GET /api/v1/admin/users
router.get('/', [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 })], validate, async (req, res) => {
  try {
    const admin = req.supabaseAdmin;
    let q = admin.from('profiles').select('id, email, full_name, role, status, language, currency, created_at');
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const from = (page - 1) * limit;
    q = q.range(from, from + limit - 1).order('created_at', { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    res.json({ users: data || [], page, limit });
  } catch (err) {
    res.status(500).json({ error: { code: 'FETCH_FAILED', message: err.message } });
  }
});

// PATCH /api/v1/admin/users/:id — update status/role (admin/super admin)
router.patch(
  '/:id',
  requireRole('ADMIN', 'SUPER_ADMIN'),
  [
    param('id').isUUID(),
    body('status').optional().isIn(['active', 'pending_verification', 'restricted', 'banned']),
    body('role').optional().isIn(['CUSTOMER', 'SUPPORT', 'ADMIN', 'SUPER_ADMIN']),
  ],
  validate,
  async (req, res) => {
    try {
      const updates = {};
      if (req.body.status !== undefined) updates.status = req.body.status;
      if (req.body.role !== undefined) updates.role = req.body.role;
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: { code: 'NO_FIELDS', message: 'No fields to update' } });
      }
      updates.updated_at = new Date().toISOString();
      const { data, error } = await req.supabaseAdmin
        .from('profiles')
        .update(updates)
        .eq('id', req.params.id)
        .select('id, email, full_name, role, status, language, currency')
        .single();
      if (error || !data) return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found' } });
      res.json({ user: data });
    } catch (err) {
      res.status(500).json({ error: { code: 'UPDATE_FAILED', message: err.message } });
    }
  }
);

module.exports = router;