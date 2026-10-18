/**
 * DRAG BOOST — admin order management
 * All orders visible; status transitions enforced by the order service.
 */
'use strict');

const express = require('express');
const { body, param, query } = require('express-validator');
const { validate } = require('../../middleware/validation');
const { requireAuth, requireRole } = require('../../middleware/auth');
const { OrderService } = require('../../services/order-service');

const router = express.Router();

// GET /api/v1/admin/orders
router.get('/', [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 })], validate, async (req, res) => {
  try {
    let q = req.supabaseAdmin.from('orders').select('*, profiles(email, full_name), services(name, platform)');
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const from = (page - 1) * limit;
    q = q.range(from, from + limit - 1).order('created_at', { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    res.json({ orders: data || [], page, limit });
  } catch (err) {
    res.status(500).json({ error: { code: 'FETCH_FAILED', message: err.message } });
  }
});

// PATCH /api/v1/admin/orders/:id/status
router.patch(
  '/:id/status',
  requireRole('ADMIN', 'SUPER_ADMIN', 'SUPPORT'),
  [param('id').isUUID(), body('status').isString().isLength({ min: 1 }), body('note').optional().trim()],
  validate,
  async (req, res) => {
    try {
      const { data: order } = await req.supabaseAdmin.from('orders').select('*').eq('id', req.params.id).single();
      if (!order) return res.status(404).json({ error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });
      const updated = await new OrderService({ supabaseAdmin: req.supabaseAdmin }).transitionOrder(req.params.id, req.body.status, req.auth.userId, req.body.note || null);
      res.json({ order: updated });
    } catch (err) {
      res.status(400).json({ error: { code: 'TRANSITION_FAILED', message: err.message } });
    }
  }
);

module.exports = router;