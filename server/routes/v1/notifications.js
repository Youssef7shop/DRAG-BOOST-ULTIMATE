/**
 * DRAG BOOST — notification routes
 * Users see their own notifications; mark-as-read is user-scoped.
 */
'use strict');

const express = require('express');
const { param } = require('express-validator');
const { validate } = require('../../middleware/validation');
const { requireAuth } = require('../../middleware/auth');

const router = express.Router();

// GET /api/v1/notifications
router.get('/', async (req, res) => {
  try {
    const { data, error } = await req.supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', req.auth.userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json({ notifications: data || [] });
  } catch (err) {
    res.status(500).json({ error: { code: 'FETCH_FAILED', message: err.message } });
  }
});

// PATCH /api/v1/notifications/:id/read
router.patch(
  '/:id/read',
  [param('id').isUUID()],
  validate,
  async (req, res) => {
    try {
      const { data, error } = await req.supabaseAdmin
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .eq('user_id', req.auth.userId)
        .select();
    if (error) throw error;
    if (!data || data.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Notification not found' } });
    }
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: { code: 'UPDATE_FAILED', message: err.message } });
  }
  }
);

module.exports = router;