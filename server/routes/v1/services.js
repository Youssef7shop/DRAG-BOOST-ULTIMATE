/**
 * DRAG BOOST — services routes
 * Public catalog reads; service mutation restricted to admins.
 * Prices are authoritative: stored server-side in minor currency units (cents).
 */
'use strict');

const express = require('express');
const { body, query, param } = require('express-validator');
const { validate } = require('../../middleware/validation');
const { requirePermission, requireRole } = require('../../middleware/auth');

const router = express.Router();

// GET /api/v1/services — list active services with filters
router.get(
  '/',
  [
    query('category').optional().isUUID(),
    query('platform').optional().trim().isLength({ max: 50 }),
    query('min_price').optional().isNumeric(),
    query('max_price').optional().isNumeric(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  async (req, res) => {
    try {
      const { category, platform, min_price, max_price, page = 1, limit = 20 } = req.query;
      const admin = req.supabaseAdmin;
      let q = admin.from('services').select('*, categories(name, slug)').eq('is_active', true);
      if (category) q = q.eq('category_id', category);
      if (platform) q = q.ilike('platform', `%${platform}%`);
      if (min_price) q = q.gte('price_cents', Number(min_price));
      if (max_price) q = q.lte('price_cents', Number(max_price));
      const from = (Number(page) - 1) * Number(limit);
      const to = from + Number(limit) - 1;
      q = q.range(from, to).order('created_at', { ascending: false });

      const { data, error, count } = await q;
      if (error) throw error;
      res.json({
        services: data || [],
        page: Number(page),
        limit: Number(limit),
        total: count ?? (data || []).length,
      });
    } catch (err) {
      res.status(500).json({ error: { code: 'FETCH_FAILED', message: err.message } });
    }
  }
);

// GET /api/v1/services/:id — service details
router.get(
  '/:id',
  [param('id').isUUID()],
  validate,
  async (req, res) => {
    try {
      const { data, error } = await req.supabaseAdmin
        .from('services')
        .select('*, categories(name, slug), providers(name)')
        .eq('id', req.params.id)
        .single();
      if (error || !data) {
        return res.status(404).json({ error: { code: 'SERVICE_NOT_FOUND', message: 'Service not found' } });
      }
      res.json({ service: data });
    } catch (err) {
      res.status(500).json({ error: { code: 'FETCH_FAILED', message: err.message } });
    }
  }
);
// POST /api/v1/services — create service (admin only)
router.post(
  '/',
  requireRole('ADMIN', 'SUPER_ADMIN'),
  [
    body('category_id').isUUID(),
    body('name').trim().isLength({ min: 2, max: 120 }),
    body('description').trim().isLength({ min: 5, max: 1000 }),
    body('platform').trim().isLength({ min: 2, max: 50 }),
    body('price_cents').isInt({ min: 0 }),
    body('currency').isIn(['MAD', 'USD', 'EUR']),
    body('min_quantity').isInt({ min: 1 }),
    body('max_quantity').isInt({ min: 1 }),
    body('fulfillment_method').optional().isIn(['manual', 'automatic']),
    body('provider_id').optional().isUUID(),
  ],
  validate,
  async (req, res) => {
    if (req.body.max_quantity < req.body.min_quantity) {
      return res.status(400).json({ error: { code: 'INVALID_RANGE', message: 'max_quantity must be >= min_quantity' } });
    }
    try {
      const { data, error } = await req.supabaseAdmin
        .from('services')
        .insert({
          ...req.body,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      await auditLog(req, 'service:create', 'service', data.id, null, data);
      res.status(201).json({ service: data });
    } catch (err) {
      res.status(500).json({ error: { code: 'CREATE_FAILED', message: err.message } });
    }
  }
);

// PATCH /api/v1/services/:id — update service (admin only)
router.patch(
  '/:id',
  requireRole('ADMIN', 'SUPER_ADMIN'),
  [param('id').isUUID()],
  validate,
  async (req, res) => {
    try {
      const { data: before } = await req.supabaseAdmin.from('services').select('*').eq('id', req.params.id).single();
      if (!before) {
        return res.status(404).json({ error: { code: 'SERVICE_NOT_FOUND', message: 'Service not found' } });
      }
      const { data, error } = await req.supabaseAdmin
        .from('services')
        .update({ ...req.body, updated_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .select()
        .single();
      if (error) throw error;
      await auditLog(req, 'service:update', 'service', data.id, before, data);
      res.json({ service: data });
    } catch (err) {
      res.status(500).json({ error: { code: 'UPDATE_FAILED', message: err.message } });
    }
  }
);

// DELETE /api/v1/services/:id — soft-delete service (super admin only)
router.delete(
  '/:id',
  requireRole('SUPER_ADMIN'),
  [param('id').isUUID()],
  validate,
  async (req, res) => {
    try {
      const { error } = await req.supabaseAdmin
        .from('services')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', req.params.id);
      if (error) throw error;
      await auditLog(req, 'service:delete', 'service', req.params.id, null, { is_active: false });
      res.json({ message: 'Service deactivated' });
    } catch (err) {
      res.status(500).json({ error: { code: 'DELETE_FAILED', message: err.message } });
    }
  }
);

async function auditLog(req, action, targetType, targetId, before, after) {
  try {
    await req.supabaseAdmin.from('audit_logs').insert({
      actor_user_id: req.auth?.userId,
      action,
      target_type: targetType,
      target_id: targetId,
      before_json: before,
      after_json: after,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

module.exports = router;