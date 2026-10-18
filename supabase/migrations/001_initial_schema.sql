-- =============================================================================
-- DRAG BOOST — Migration 001: initial schema (part 1)
-- Supabase PostgreSQL. Monetary amounts in minor units (cents).
-- =============================================================================

create extension if not exists pgcrypto;

create table roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null check (name in ('CUSTOMER','SUPPORT','ADMIN','SUPER_ADMIN')),
  description text,
  created_at timestamptz default now()
);

create table permissions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  description text,
  created_at timestamptz default now()
);

create table user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  assigned_at timestamptz default now(),
  assigned_by uuid references auth.users(id),
  primary key (user_id, role_id)
);

create table role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'CUSTOMER' check (role in ('CUSTOMER','SUPPORT','ADMIN','SUPER_ADMIN')),
  status text not null default 'pending_verification' check (status in ('active','pending_verification','restricted','banned')),
  language text not null default 'en' check (language in ('en','fr','ar')),
  currency text not null default 'USD' check (currency in ('MAD','USD','EUR')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now()
);

create table providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
create table services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id),
  name text not null,
  description text not null,
  platform text not null check (platform in ('Instagram','TikTok','YouTube','Facebook','Telegram','X','Other')),
  price_cents bigint not null default 0 check (price_cents >= 0),
  currency text not null default 'USD' check (currency in ('MAD','USD','EUR')),
  min_quantity integer not null default 1 check (min_quantity >= 1),
  max_quantity integer not null default 10000 check (max_quantity >= 1),
  is_active boolean default true,
  fulfillment_method text not null default 'manual' check (fulfillment_method in ('manual','automatic')),
  provider_id uuid references providers(id),
  estimated_delivery text,
  seed_data boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint quantity_range check (max_quantity >= min_quantity)
);

create table provider_services (
  provider_id uuid not null references providers(id) on delete cascade,
  service_id uuid not null references services(id) on delete cascade,
  external_service_id text,
  primary key (provider_id, service_id)
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service_id uuid references services(id),
  provider_order_id text,
  status text not null default 'PENDING_PAYMENT'
    check (status in ('PENDING_PAYMENT','PAID','QUEUED','IN_PROGRESS','PARTIAL','COMPLETED','FAILED','CANCELED','REFUNDED')),
  quantity integer not null check (quantity >= 1),
  target text not null,
  unit_price_cents bigint not null check (unit_price_cents >= 0),
  currency text not null check (currency in ('MAD','USD','EUR')),
  total_amount_cents bigint not null check (total_amount_cents >= 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz
);

create table order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status text not null,
  actor_user_id uuid references auth.users(id),
  note text,
  created_at timestamptz default now()
);
create table refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id) on delete cascade,
  order_id uuid references orders(id),
  amount_cents bigint not null check (amount_cents >= 0),
  currency text not null check (currency in ('MAD','USD','EUR')),
  status text not null default 'PENDING'
    check (status in ('PENDING','SUCCEEDED','FAILED')),
  reason text,
  created_at timestamptz default now()
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id),
  invoice_number text unique,
  amount_cents bigint not null,
  currency text not null check (currency in ('MAD','USD','EUR')),
  status text not null default 'issued',
  pdf_url text,
  created_at timestamptz default now()
);

create table wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  currency text not null check (currency in ('MAD','USD','EUR')),
  balance_cents bigint not null default 0 check (balance_cents >= 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  status text not null default 'open' check (status in ('open','pending','resolved','closed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references support_tickets(id) on delete cascade,
  sender_id uuid references auth.users(id),
  body text not null,
  created_at timestamptz default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz default now()
);

create table site_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id),
  action text not null,
  target_type text not null,
  target_id uuid,
  before_json jsonb,
  after_json jsonb,
  ip_address inet,
  created_at timestamptz default now()
);

create table webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_id text not null,
  event_type text not null,
  received_at timestamptz default now(),
  processed boolean default false,
  payload jsonb,
  constraint webhook_events_unique unique (provider, external_id, event_type)
);

create table idempotency_keys (
  key text primary key,
  user_id uuid references auth.users(id),
  request_hash text,
  response jsonb,
  created_at timestamptz default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create table exchange_rates (
  base_currency text not null check (base_currency in ('MAD','USD','EUR')),
  target_currency text not null check (target_currency in ('MAD','USD','EUR')),
  rate numeric(20,10) not null check (rate > 0),
  updated_at timestamptz default now(),
  primary key (base_currency, target_currency)
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references orders(id),
  provider text not null,
  external_payment_id text,
  amount_cents bigint not null check (amount_cents >= 0),
  currency text not null check (currency in ('MAD','USD','EUR')),
  status text not null default 'PENDING'
    check (status in ('PENDING','SUCCEEDED','FAILED','REFUNDED')),
  webhook_verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references orders(id),
  payment_id uuid references payments(id),
  type text not null check (type in ('payment','refund','adjustment')),
  amount_cents bigint not null,
  currency text not null check (currency in ('MAD','USD','EUR')),
  status text not null check (status in ('PENDING','SUCCEEDED','FAILED','REFUNDED')),
  created_at timestamptz default now()
);
  adapter_type text not null,
  is_active boolean default true,
  credentials_configured boolean default false,
  created_at timestamptz default now()
);