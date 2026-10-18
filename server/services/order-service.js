/**
 * DRAG BOOST — order service
 * Server-side authoritative order creation and status transitions.
 * Prices are read from the database, never trusted from the client.
 */
'use strict');

const { isValidTransition, ORDER_STATUSES } = require('../utils/state-machine');
const { isSupportedCurrency } = require('../utils/currency');

class OrderService {
  constructor({ supabaseAdmin }) {
    this.supabaseAdmin = supabaseAdmin;
  }

  async createOrder({ userId, serviceId, quantity, target, idempotencyKey }) {
    const admin = this.supabaseAdmin;

    const { data: service, error } = await admin
      .from('services')
      .select('id, name, price_cents, currency, min_quantity, max_quantity, is_active')
      .eq('id', serviceId)
      .single();
    if (error || !service) throw new Error('Service not found');
    if (!service.is_active) throw new Error('Service is not available');
    if (!isSupportedCurrency(service.currency)) throw new Error('Unsupported service currency');

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty < service.min_quantity || qty > service.max_quantity) {
      throw new Error(`Quantity must be between ${service.min_quantity} and ${service.max_quantity}`);
    }

    if (!target || String(target).trim().length === 0 || String(target).length > 255) {
      throw new Error('Invalid target');
    }

    const unitPrice = Number(service.price_cents);
    const totalAmount = unitPrice * qty;

    if (idempotencyKey) {
      const { data: existing } = await admin
        .from('idempotency_keys')
        .select('response')
        .eq('key', idempotencyKey)
        .single();
      if (existing && existing.response) {
        return { order: existing.response.order || existing.response, duplicated: true };
      }
    }

    const { data: order, error: orderError } = await admin
      .from('orders')
      .insert({
        user_id: userId,
        service_id: serviceId,
        status: 'PENDING_PAYMENT',
        quantity: qty,
        target: String(target).trim(),
        unit_price_cents: unitPrice,
        currency: service.currency,
        total_amount_cents: totalAmount,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (orderError) throw orderError;

    await admin.from('order_events').insert({
      order_id: order.id,
      status: 'PENDING_PAYMENT',
      actor_user_id: userId,
      note: 'Order created',
      created_at: new Date().toISOString(),
    });

    if (idempotencyKey) {
      await admin.from('idempotency_keys').insert({
        key: idempotencyKey,
        user_id: userId,
        request_hash: null,
        response: { order },
        created_at: new Date().toISOString(),
      });
    }

    return { order, duplicated: false };
  }

  async transitionOrder(orderId, newStatus, actorId, note = null) {
    const admin = this.supabaseAdmin;
    const { data: order } = await admin.from('orders').select('*').eq('id', orderId).single();
    if (!order) throw new Error('Order not found');
    if (!isValidTransition(order.status, newStatus)) {
      throw new Error(`Invalid order status transition: ${order.status} -> ${newStatus}`);
    }
    const { data, error } = await admin
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .single();
    if (error) throw error;
    await admin.from('order_events').insert({
      order_id: orderId,
      status: newStatus,
      actor_user_id: actorId,
      note,
      created_at: new Date().toISOString(),
    });
    return data;
  }

  static getOrderStatuses() {
    return ORDER_STATUSES;
  }
}

module.exports = { OrderService };