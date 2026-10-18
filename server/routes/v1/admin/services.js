/**
 * DRAG BOOST — admin service management
 * Full CRUD for services; prices remain server-authoritative.
 */
'use strict');

const express = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../../middleware/validation');
const { requireAuth, requireRole } = require('../../middleware/auth');

const router = express.Router();

// GET /api/v1/admin/services (all services, including inactive)
router.get('/', async (req, res) => {
  try {
    const { data, error } = await req.supabaseAdmin
      .from('services')
      .select('*, categories(name, slug), providers(name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ services: data || [] });
  } catch (err) {
    res.status(500).json({ error: { code: 'FETCH_FAILED', message: err.message } });
  }
});

// POST /api/v1/admin/services
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
    try {
      if (req.body.max_quantity < req.body.min_quantity) {
        return res.status(400).json({ error: { code: 'INVALID_RANGE', message: 'max_quantity must be >= min_quantity' } });
      }
      const { data, error } = await req.supabaseAdmin
        .from('services')
        .insert({ ...req.body, updated_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      res.status(201).json({ service: data });
    } catch (err) {
      res.status(500).json({ error: { code: 'CREATE_FAILED', message: err.message } });
    }
  }
);

// PATCH /api/v1/admin/services/:id
router.patch(
  '/:id',
  requireRole('ADMIN', 'SUPER_ADMIN'),
  [param('id').isUUID()],
  validate,
  async (req, res) => {
    try {
      const { data, error } = await req.supabaseAdmin
        .from('services')
        .update({ ...req.body, updated_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .select()
        .single();
      if (error || !data) return res.status(404).json({ error: { code: 'SERVICE_NOT_FOUND', message: 'Service not found' } });
      res.json({ service: data });
    } catch (err) {
      res.status(500).json({ error: { code: 'UPDATE_FAILED', message: err.message } });
    }
  }
);

module.exports = router;