/**
 * DRAG BOOST — transaction routes
 * Transactions are immutable financial records; customers see only their own.
 */
'use strict');

const express = require('express');
const { param, query } = require('express-validator');
const { validate } = require('../../middleware/validation');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();

// GET /api/v1/transactions
router.get(
  '/',
  [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 })],
  validate,
  async (req, res) => {
    try {
      const admin = req.supabaseAdmin;
      const isStaff = ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'].includes(req.auth.role);
      let q = admin.from('transactions').select('*, orders(id, status), payments(id, status)');
      if (!isStaff) q = q.eq('user_id', req.auth.userId);
      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 20);
      const from = (page - 1) * limit;
      q = q.range(from, from + limit - 1).order('created_at', { ascending: false });
      const { data, error } = await q;
      if (error) throw error;
      res.json({ transactions: data || [], page, limit });
    } catch (err) {
      res.status(500).json({ error: { code: 'FETCH_FAILED', message: err.message } });
    }
  }
);

// GET /api/v1/transactions/:id
router.get('/:id', [param('id').isUUID()], validate, async (req, res) => {
  try {
    const { data: tx } = await req.supabaseAdmin.from('transactions').select('*').eq('id', req.params.id).single();
    if (!tx) {
      return res.status(404).json({ error: { code: 'TRANSACTION_NOT_FOUND', message: 'Transaction not found' } });
    }
    const isStaff = ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'].includes(req.auth.role);
    if (!isStaff && tx.user_id !== req.auth.userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot access this transaction' } });
    }
    res.json({ transaction: tx });
  } catch (err) {
    res.status(500).json({ error: { code: 'FETCH_FAILED', message: err.message } });
  }
});

module.exports = router;