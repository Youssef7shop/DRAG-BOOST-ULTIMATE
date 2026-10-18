/**
 * DRAG BOOST — admin routes index
 * Every admin route requires authentication + server-side authorization.
 * CSRF verification is applied at the app level for /api/v1/admin.
 */
'use strict');

const express = require('express');
const usersRouter = require('./users');
const servicesRouter = require('./services');
const ordersRouter = require('./orders');
const providersRouter = require('./providers');
const reportsRouter = require('./reports');
const auditLogsRouter = require('./audit-logs');

const router = express.Router();

router.use('/users', usersRouter);
router.use('/services', servicesRouter);
router.use('/orders', ordersRouter);
router.use('/providers', providersRouter);
router.use('/reports', reportsRouter);
router.use('/audit-logs', auditLogsRouter);

router.get('/stats', async (req, res) => {
  try {
    const admin = req.supabaseAdmin;
    const [usersRes, ordersRes, servicesRes, ticketsRes] = await Promise.all([
      admin.from('profiles').select('id, role, status'),
      admin.from('orders').select('id, status, total_amount_cents, currency'),
      admin.from('services').select('id, is_active'),
      admin.from('support_tickets').select('id, status'),
    ]);
    const users = usersRes.data || [];
    const orders = ordersRes.data || [];
    const services = servicesRes.data || [];
    const tickets = ticketsRes.data || [];

    const revenueByCurrency = {};
    for (const order of orders) {
      revenueByCurrency[order.currency] = (revenueByCurrency[order.currency] || 0) + Number(order.total_amount_cents || 0);
    }

    res.json({
      users: { total: users.length, byRole: groupBy(users, 'role'), byStatus: groupBy(users, 'status') },
      orders: { total: orders.length, byStatus: groupBy(orders, 'status') },
      services: { total: services.length, active: services.filter((s) => s.is_active).length },
      tickets: { total: tickets.length, byStatus: groupBy(tickets, 'status') },
      revenueByCurrency,
      note: 'Revenue totals are per-currency (minor units). Currencies are never summed.',
    });
  } catch (err) {
    res.status(500).json({ error: { code: 'STATS_FAILED', message: err.message } });
  }
});

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key] || 'unknown';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

module.exports = router;