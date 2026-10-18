/**
 * DRAG BOOST — payment routes
 * Payments use a provider adapter. No real provider is configured by default;
 * the adapter is disabled and clearly labeled until credentials are verified.
 * Webhooks are signature-verified and idempotent.
 */
'use strict');

const express = require('express');
const { body } = require('express-validator');
const { validate } = require('../../middleware/validation');
const { requireAuth, requirePermission } = require('../../middleware/auth');
const { PaymentAdapter } = require('../../payments/adapter');

const router = express.Router();

const paymentAdapter = new PaymentAdapter();

// POST /api/v1/payments/create-intent — create a payment session (server-side)
router.post(
  '/create-intent',
  [body('order_id').isUUID()],
  validate,
  async (req, res) => {
    try {
      const { orderId } = req.body;
      const { data: order } = await req.supabaseAdmin
        .from('orders')
        .select('id, user_id, total_amount_cents, currency, status')
        .eq('id', orderId)
        .single();
      if (!order) return res.status(404).json({ error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } });
      if (order.user_id !== req.auth.userId) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot pay for this order' } });
      }
      if (order.status !== 'PENDING_PAYMENT') {
        return res.status(400).json({ error: { code: 'INVALID_ORDER_STATUS', message: 'Order is not awaiting payment' } });
      }

      const result = await paymentAdapter.createPayment({
        orderId,
        amountCents: order.total_amount_cents,
        currency: order.currency,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: { code: 'PAYMENT_FAILED', message: err.message } });
    }
  }
);

// POST /api/v1/payments/webhook — provider webhook (signature verified, idempotent)
router.post(
  '/webhook',
  body('provider').optional().isIn(['stripe', 'mock']),
  validate,
  async (req, res) => {
    try {
      const result = await paymentAdapter.handleWebhook(req);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: { code: 'WEBHOOK_FAILED', message: err.message } });
    }
  }
);

// GET /api/v1/payments/status — adapter status (disabled unless real credentials verified)
router.get('/status', (req, res) => {
  res.json({ adapter: paymentAdapter.status(), configured: paymentAdapter.isConfigured() });
});

module.exports = router;