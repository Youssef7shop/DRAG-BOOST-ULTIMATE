/**
 * DRAG BOOST — authentication middleware
 * Verifies Supabase access tokens (Authorization header or httpOnly cookie),
 * loads the server-managed profile, and attaches role/permissions to the request.
 * Role is read from profiles table — never from client-editable metadata.
 */
'use strict';

const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');

const ROLE_HIERARCHY = {
  CUSTOMER: 0,
  SUPPORT: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

const ROLE_PERMISSIONS = {
  CUSTOMER: [
    'profile:read',
    'profile:update:own',
    'orders:read:own',
    'orders:create',
    'payments:create:own',
    'tickets:create',
    'wallet:read:own',
  ],
  SUPPORT: [
    'profile:read',
    'profile:update:own',
    'orders:read',
    'orders:update:status:limited',
    'tickets:read',
    'tickets:update',
    'users:read',
  ],
  ADMIN: [
    'profile:read',
    'profile:update',
    'users:read',
    'users:update',
    'orders:read',
    'orders:update:status',
    'services:read',
    'services:create',
    'services:update',
    'categories:read',
    'categories:create',
    'categories:update',
    'providers:read',
    'providers:update',
    'payments:read',
    'refunds:read',
    'refunds:update',
    'tickets:read',
    'tickets:update',
    'notifications:read',
    'settings:read',
    'reports:read',
    'audit-logs:read',
  ],
  SUPER_ADMIN: [
    'profile:read',
    'profile:update',
    'users:read',
    'users:update',
    'users:delete',
    'roles:read',
    'roles:update',
    'orders:read',
    'orders:update:status',
    'orders:delete',
    'services:read',
    'services:create',
    'services:update',
    'services:delete',
    'categories:read',
    'categories:create',
    'categories:update',
    'categories:delete',
    'providers:read',
    'providers:create',
    'providers:update',
    'providers:delete',
    'payments:read',
    'refunds:read',
    'refunds:update',
    'refunds:create',
    'tickets:read',
    'tickets:update',
    'tickets:delete',
    'notifications:read',
    'notifications:create',
    'settings:read',
    'settings:update',
    'reports:read',
    'reports:create',
    'audit-logs:read',
    'audit-logs:export',
    'security:read',
    'security:update',
  ],
};

function hasPermission(role, permission) {
  return (ROLE_PERMISSIONS[role] || []).includes(permission);
}

async function verifySupabaseToken(accessToken) {
  const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    return { user: null, error: error || new Error('Invalid token') };
  }
  return { user: data.user, error: null };
}

async function getProfile(adminClient, userId) {
  const { data, error } = await adminClient
    .from('profiles')
    .select('id, email, full_name, role, status, language, currency, created_at, updated_at')
    .eq('id', userId)
    .single();
  if (error || !data) return { profile: null, error: error || new Error('Profile not found') };
  return { profile: data, error: null };
}

async function requireAuth(req, res, next) {
  const token =
    req.get('authorization')?.replace(/^Bearer\s+/i, '') || req.cookies[config.sessionCookieName];
  if (!token) {
    return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
  }

  try {
    const { user, error } = await verifySupabaseToken(token);
    if (error || !user) {
      return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Invalid or expired session' } });
    }

    const adminClient = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { profile, error: profileError } = await getProfile(adminClient, user.id);
    if (profileError || !profile) {
      return res.status(403).json({ error: { code: 'PROFILE_NOT_FOUND', message: 'User profile not found' } });
    }

    if (profile.status !== 'active') {
      return res.status(403).json({
        error: { code: 'ACCOUNT_RESTRICTED', message: `Account status: ${profile.status}` },
      });
    }

    req.auth = {
      userId: user.id,
      email: user.email,
      profileId: profile.id,
      role: profile.role,
      language: profile.language,
      currency: profile.currency,
      permissions: ROLE_PERMISSIONS[profile.role] || [],
    };
    req.supabaseAdmin = adminClient;
    next();
  } catch (err) {
    res.status(500).json({ error: { code: 'AUTH_ERROR', message: 'Authentication service error' } });
  }
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
    }
    if (!hasPermission(req.auth.role, permission)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: `Permission required: ${permission}` } });
    }
    next();
  };
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
    }
    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient role' } });
    }
    next();
  };
}

function canAccessOrder(order) {
  return (req) => {
    if (!req.auth) return false;
    if (['ADMIN', 'SUPER_ADMIN', 'SUPPORT'].includes(req.auth.role)) return true;
    return order && order.user_id === req.auth.userId;
  };
}

module.exports = {
  requireAuth,
  requirePermission,
  requireRole,
  hasPermission,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  canAccessOrder,
  verifySupabaseToken,
};