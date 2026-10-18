/**
 * DRAG BOOST — provider adapter interface
 * Fulfillment provider adapters are isolated here. The mock/test adapter is
 * clearly labeled and is NOT used for production fulfillment unless a real
 * provider is contracted and verified.
 */
'use strict');

class ProviderAdapter {
  constructor() {
    this.configured = false;
    this.testAdapter = true;
  }

  status() {
    return this.testAdapter ? 'test (disabled in production)' : (this.configured ? 'configured' : 'disabled');
  }

  isConfigured() {
    return this.configured;
  }

  async createFulfillment({ orderId, serviceId, quantity, target }) {
    const err = new Error('No fulfillment provider configured. Orders require manual processing.');
    err.code = 'PROVIDER_DISABLED';
    err.statusCode = 503;
    throw err;
  }

  async syncStatus({ providerOrderId }) {
    const err = new Error('Provider status sync is not available.');
    err.code = 'PROVIDER_DISABLED';
    err.statusCode = 503;
    throw err;
  }
}

module.exports = { ProviderAdapter };