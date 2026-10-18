/**
 * DRAG BOOST — order routes
 * Order creation is server-calculated; status transitions are restricted to staff.
 */
'use strict');

const express = require('express');
const { body, param, query } = require('express-validator');
const { validate } = require('../../middleware/validation');
const { requireAuth, requirePermission } = require('../../middleware/auth');
const { OrderService } = require('../../services/order-service');
const { ORDER_STATUSES } = require('../../utils/state-machine');

const router = express.Router();

// POST /api/v1/orders
router.post(
  '/',
  [
    body('service_id').isUUID(),
    body('quantity').isInt({ min: 1 }),
    body('target').trim().isLength({ min: 1, max: 255 }),
    body('idempotency_key').optional().trim().isLength({ min: 1, max: 128 }),
  ],
  validate,
  async (req, res) => {
    try {
      const { order, duplicated } = await new OrderService({ supabaseAdmin: req.supabaseAdmin }).createOrder({
        userId: req.auth.userId,
        serviceId: req.body.service_id,
        quantity: req.body.quantity,
        target: req.body.target,
        idempotencyKey: req.body.idempotency_key,
      });
      res.status(duplicated ? 200 : 201).json({ order, duplicated });
    } catch (err) {
      res.status(400).json({ error: { code: 'ORDER_FAILED', message: err.message } });
    }
  }
);

// GET /api/v1/orders — list (own orders for customers; all for staff)
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(ORDER_STATUSES),
  ],
  validate,
  async (req, res) => {
    try {
      const admin = req.supabaseAdmin;
      const isStaff = ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'].includes(req.auth.role);
      let q = admin
        .from('orders')
        .select('*, services(name, platform), order_events(status, created_at, actor_user_id)');
      if (!isStaff) q = q.eq('user_id', req.auth.userId);
      if (req.query.status) q = q.eq('status', req.query.status);
      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 20);
      const from = (page - 1) * limit;
      q = q.range(from, from + limit - 1).order('created_at', { ascending: false });
// PATCH /api/v1/orders/:id/status — staff/admin only, valid transitions enforced
router.patch(
  '/:id/status',
  requirePermission('orders:update:status'),
  [
    param('id').isUUID(),
    body('status').isIn(ORDER_STATUSES),
    body('note').optional().trim().isLength({ max: 500 }),
  ],
  validate,
  async (req, res) => {
    try {
      const { data: order } = await req.supabaseAdmin
        .from('orders')
        .select('*')
        .eq('id', req.params.id)
        .single();
      if (!order) {
        return res.status(404).json({ error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });
      }
      const updated = await new OrderService({ supabaseAdmin: req.supabaseAdmin }).transitionOrder(
        req.params.id,
        req.body.status,
        req.auth.userId,
        req.body.note || null
      );
      res.json({ order: updated });
    } catch (err) {
      res.status(400).json({ error: { code: 'TRANSITION_FAILED', message: err.message } });
    }
  }
);

module.exports = router;
      const { data, error } = await q;
      if (error) throw error;
      res.json({ orders: data || [], page, limit });
    } catch (err) {
      res.status(500).json({ error: { code: 'FETCH_FAILED', message: err.message } });
    }
  }
);

// GET /api/v1/orders/:id
router.get('/:id', [param('id').isUUID()], validate, async (req, res) => {
  try {
    const { data: order } = await req.supabaseAdmin
      .from('orders')
      .select('*, services(name, platform, price_cents, currency), order_events(*)')
      .eq('id', req.params.id)
      .single();
    if (!order) {
      return res.status(404).json({ error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });
    }
    const isStaff = ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'].includes(req.auth.role);
    if (!isStaff && order.user_id !== req.auth.userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot access this order' } });
    }
    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: { code: 'FETCH_FAILED', message: err.message } });
  }
);