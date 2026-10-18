/**
 * DRAG BOOST — Supabase clients
 * anonClient: for browser-mimicking requests (rarely used server-side)
 * adminClient: service-role client, server-side only, bypasses RLS.
 */
'use strict';

const { createClient } = require('@supabase/supabase-js');
const config = require('./env');

function createAnonClient(accessToken) {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    },
  });
}

function createAdminClient() {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

module.exports = { createAnonClient, createAdminClient };