/**
 * DRAG BOOST — admin audit log inspection
 * Append-only audit events. Admins can inspect; nothing is editable here.
 */
'use strict');

const express = require('express');
const { query } = require('express-validator');
const { validate } = require('../../middleware/validation');
const { requireAuth, requireRole } = require('../../middleware/auth');

const router = express.Router();

router.get(
  '/',
  requireRole('ADMIN', 'SUPER_ADMIN'),
  [query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 })],
  validate,
  async (req, res) => {
    try {
      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 20);
      const from = (page - 1) * limit;
      const { data, error } = await req.supabaseAdmin
        .from('audit_logs')
        .select('*, profiles(email)')
        .order('created_at', { ascending: false })
        .range(from, from + limit - 1);
      if (error) throw error;
      res.json({ auditLogs: data || [], page, limit });
    } catch (err) {
      res.status(500).json({ error: { code: 'FETCH_FAILED', message: err.message } });
    }
  }
);

module.exports = router;