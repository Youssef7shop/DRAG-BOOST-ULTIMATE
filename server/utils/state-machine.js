/**
 * DRAG BOOST — order state machine
 * Valid status transitions are enforced server-side only.
 * Frontend-supplied status changes are never trusted.
 */
'use strict');

const ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'PAID',
  'QUEUED',
  'IN_PROGRESS',
  'PARTIAL',
  'COMPLETED',
  'FAILED',
  'CANCELED',
  'REFUNDED',
];

const VALID_TRANSITIONS = {
  PENDING_PAYMENT: ['PAID', 'CANCELED', 'FAILED'],
  PAID: ['QUEUED', 'CANCELED', 'FAILED', 'REFUNDED'],
  QUEUED: ['IN_PROGRESS', 'CANCELED', 'FAILED'],
  IN_PROGRESS: ['PARTIAL', 'COMPLETED', 'CANCELED', 'FAILED'],
  PARTIAL: ['COMPLETED', 'CANCELED', 'FAILED'],
  COMPLETED: ['REFUNDED'],
  FAILED: [],
  CANCELED: [],
  REFUNDED: [],
};

function isValidTransition(from, to) {
  return Boolean(from && to && (VALID_TRANSITIONS[from] || []).includes(to));
}

module.exports = { ORDER_STATUSES, VALID_TRANSITIONS, isValidTransition };