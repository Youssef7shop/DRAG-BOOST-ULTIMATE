/**
 * DRAG BOOST — currency utilities
 * Supported transaction currencies: MAD, USD, EUR.
 * Amounts are stored as integer minor units (cents) to avoid floating-point errors.
 * Amounts from different currencies are never summed without explicit conversion.
 */
'use strict');

const SUPPORTED_CURRENCIES = ['MAD', 'USD', 'EUR'];

function isSupportedCurrency(currency) {
  return Boolean(currency && SUPPORTED_CURRENCIES.includes(currency));
}

function toMinorUnits(amount) {
  const cents = Math.round(Number(amount) * 100);
  if (!Number.isFinite(cents) || cents < 0) throw new Error('Invalid monetary amount');
  return cents;
}

function fromMinorUnits(cents) {
  return (Number(cents) / 100).toFixed(2);
}

function formatAmount(cents, currency) {
  if (!isSupportedCurrency(currency)) throw new Error(`Unsupported currency: ${currency}`);
  return { currency, amount: fromMinorUnits(cents) };
}

module.exports = { SUPPORTED_CURRENCIES, isSupportedCurrency, toMinorUnits, fromMinorUnits, formatAmount };