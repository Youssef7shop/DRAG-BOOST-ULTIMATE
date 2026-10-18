/**
 * DRAG BOOST — support ticket routes
 * Customers see their own tickets; staff see all tickets.
 */
'use strict');

const express = require('express');
const { body, param } = require('express-validator');
const { validate } = require('../../middleware/validation');
const { requireAuth, requirePermission } = require('../../middleware/auth');

const router = express.Router();

// GET /api/v1/tickets
router.get('/', async (req, res) => {
  try {
    const admin = req.supabaseAdmin;
    const isStaff = ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'].includes(req.auth.role);
    let q = admin.from('support_tickets').select('*, ticket_messages(created_at, sender_id, body)');
    if (!isStaff) q = q.eq('user_id', req.auth.userId);
    const { data, error } = await q.order('updated_at', { ascending: false });
    if (error) throw error;
    res.json({ tickets: data || [] });
  } catch (err) {
    res.status(500).json({ error: { code: 'FETCH_FAILED', message: err.message } });
  }
});

// POST /api/v1/tickets
router.post(
  '/',
  [
    body('subject').trim().isLength({ min: 3, max: 200 }),
    body('message').trim().isLength({ min: 1, max: 5000 }),
  ],
  validate,
  async (req, res) => {
    try {
      const admin = req.supabaseAdmin;
      const { data: ticket } = await admin
        .from('support_tickets')
        .insert({
          user_id: req.auth.userId,
          subject: req.body.subject,
          status: 'open',
          priority: 'normal',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      await admin.from('ticket_messages').insert({
        ticket_id: ticket.id,
        sender_id: req.auth.userId,
        body: req.body.message,
        created_at: new Date().toISOString(),
      });
      res.status(201).json({ ticket });
    } catch (err) {
      res.status(500).json({ error: { code: 'CREATE_FAILED', message: err.message } });
    }
  }
);

// GET /api/v1/tickets/:id
router.get('/:id', [param('id').isUUID()], validate, async (req, res) => {
  try {
    const { data: ticket } = await req.supabaseAdmin
      .from('support_tickets')
      .select('*, ticket_messages(*)')
      .eq('id', req.params.id)
      .single();
    if (!ticket) return res.status(404).json({ error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found' } });
    const isStaff = ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'].includes(req.auth.role);
    if (!isStaff && ticket.user_id !== req.auth.userId) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot access this ticket' } });
    }
    res.json({ ticket });
  } catch (err) {
    res.status(500).json({ error: { code: 'FETCH_FAILED', message: err.message } });
  }
});

// POST /api/v1/tickets/:id/messages
router.post(
  '/:id/messages',
  [
    param('id').isUUID(),
    body('body').trim().isLength({ min: 1, max: 5000 }),
  ],
  validate,
  async (req, res) => {
    try {
      const { data: ticket } = await req.supabaseAdmin.from('support_tickets').select('user_id, status').eq('id', req.params.id).single();
      if (!ticket) return res.status(404).json({ error: { code: 'TICKET_NOT_FOUND', message: 'Ticket not found' } });
      const isStaff = ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'].includes(req.auth.role);
      if (!isStaff && ticket.user_id !== req.auth.userId) {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Cannot access this ticket' } });
      }
      const { data: message } = await req.supabaseAdmin
        .from('ticket_messages')
        .insert({
          ticket_id: req.params.id,
          sender_id: req.auth.userId,
          body: req.body.body,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      await req.supabaseAdmin.from('support_tickets').update({ updated_at: new Date().toISOString() }).eq('id', req.params.id);
      res.status(201).json({ message });
    } catch (err) {
      res.status(500).json({ error: { code: 'CREATE_FAILED', message: err.message } });
    }
  }
);

module.exports = router;