/**
 * DRAG BOOST — mock/test provider adapter
 * CLEARLY LABELED TEST ADAPTER. Used only for automated tests and local
 * development when no real provider credentials exist. Never enabled in
 * production without a verified provider contract.
 */
'use strict');

class MockProviderAdapter {
  constructor() {
    this.name = 'mock';
    this.testAdapter = true;
  }

  status() {
    return 'mock (test only — disabled in production)';
  }

  isConfigured() {
    return false;
  }

  async createFulfillment({ orderId, serviceId, quantity, target }) {
    // Simulates a provider accepting the order. No external call is made.
    return {
      provider: 'mock',
      externalOrderId: `mock_${orderId}`,
      status: 'accepted',
      note: 'Test adapter: no real fulfillment performed.',
    };
  }

  async syncStatus({ providerOrderId }) {
    return { provider: 'mock', externalOrderId: providerOrderId, status: 'synced_from_mock' };
  }
}

module.exports = { MockProviderAdapter };