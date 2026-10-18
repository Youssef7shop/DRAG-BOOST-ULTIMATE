/**
 * DRAG BOOST — payment adapter interface + stub implementation
 * STATUS: DISABLED. No real payment provider is configured by default.
 *
 * A real provider (e.g. Stripe) may be wired here only after:
 * 1. Valid credentials are confirmed available and eligible,
 * 2. API documentation is reviewed,
 * 3. The adapter passes webhook-signature and idempotency tests.
 *
 * All monetary amounts are handled in minor units (cents) and the original
 * currency of the order is preserved.
 */
'use strict');

const config = require('../../config/env');

function placeholder(value) {
  return !value || value.includes('your_') || value.includes('sk_test_your') || value.includes('whsec_your');
}

class PaymentAdapter {
  constructor() {
    this.configured =
      !placeholder(config.stripeSecretKey) &&
      !placeholder(config.stripeWebhookSecret) &&
      Boolean(config.stripeSecretKey && config.stripeWebhookSecret);
  }

  status() {
    return this.configured ? 'configured' : 'disabled';
  }

  isConfigured() {
    return this.configured;
  }

  async createPayment({ orderId, amountCents, currency }) {
    if (!this.configured) {
      const err = new Error('Payment provider is not configured. Real payments are disabled.');
      err.code = 'PAYMENT_DISABLED';
      err.statusCode = 503;
      throw err;
    }
    // Real provider implementation goes here after verification.
    const err = new Error('Payment provider implementation not yet integrated.');
    err.code = 'PAYMENT_NOT_INTEGRATED';
    err.statusCode = 501;
    throw err;
  }

  async handleWebhook(req) {
    if (!this.configured) {
      const err = new Error('Payment webhooks are disabled: no provider configured.');
      err.code = 'PAYMENT_DISABLED';
      err.statusCode = 503;
      throw err;
    }
    // Signature verification and idempotent processing go here.
    const err = new Error('Webhook handler not yet integrated.');
    err.code = 'PAYMENT_NOT_INTEGRATED';
    err.statusCode = 501;
    throw err;
  }
}

module.exports = { PaymentAdapter };