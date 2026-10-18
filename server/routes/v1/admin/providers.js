/**
 * DRAG BOOST — admin provider management
 * Provider health and configuration status (no secrets exposed).
 */
'use strict');

const express = require('express');
const { MockProviderAdapter } = require('../../../providers/mock-provider');
const { PaymentAdapter } = require('../../../payments/adapter');

const router = express.Router();

const mockProvider = new MockProviderAdapter();
const paymentAdapter = new PaymentAdapter();

router.get('/', (req, res) => {
  res.json({
    providers: [
      {
        name: 'mock-fulfillment',
        type: 'fulfillment',
        status: mockProvider.status(),
        configured: mockProvider.isConfigured(),
        note: 'Test adapter only. No real fulfillment provider integrated.',
      },
      {
        name: 'stripe-payments',
        type: 'payment',
        status: paymentAdapter.status(),
        configured: paymentAdapter.isConfigured(),
        note: 'Disabled until real Stripe credentials are verified.',
      },
    ],
  });
});

module.exports = router;