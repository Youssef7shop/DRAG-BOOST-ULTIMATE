/**
 * DRAG BOOST — admin reports
 * Per-currency revenue summaries; currencies never summed.
 */
'use strict');

const express = require('express');
const { requireRole } = require('../../middleware/auth');

const router = express.Router();

router.get('/revenue', requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const admin = req.supabaseAdmin;
    const { data: orders } = await admin.from('orders').select('total_amount_cents, currency, status, created_at');
    const ordersList = orders || [];
    const byCurrency = { MAD: 0, USD: 0, EUR: 0 };
    const byStatusAndCurrency = {};
    for (const o of ordersList) {
      if (o.status === 'PAID' || o.status === 'COMPLETED') {
        byCurrency[o.currency] = (byCurrency[o.currency] || 0) + Number(o.total_amount_cents || 0);
      }
      const key = `${o.status}|${o.currency}`;
      byStatusAndCurrency[key] = (byStatusAndCurrency[key] || 0) + Number(o.total_amount_cents || 0);
    }
    res.json({
      revenueByCurrencyCents: byCurrency,
      revenueByCurrency: { MAD: (byCurrency.MAD / 100).toFixed(2), USD: (byCurrency.USD / 100).toFixed(2), EUR: (byCurrency.EUR / 100).toFixed(2) },
      byStatusAndCurrency,
      note: 'Amounts are per-currency minor units. Cross-currency sums are intentionally not computed.',
    });
  } catch (err) {
    res.status(500).json({ error: { code: 'REPORT_FAILED', message: err.message } });
  }
});

module.exports = router;