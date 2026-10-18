-- =============================================================================
-- DRAG BOOST — seed data (DEVELOPMENT ONLY)
--
-- WARNING: All data below is development seed data. It is NOT verified
-- commercial information, NOT real pricing, and NOT guaranteed delivery.
-- Prices are placeholders in minor currency units (cents).
-- Before production use, replace with real, policy-compliant services and
-- prices reviewed against applicable platform policies.
-- =============================================================================

insert into roles (name, description) values
  ('CUSTOMER','Customer role — can place and view own orders'),
  ('SUPPORT','Support agent — read orders/tickets, limited status updates'),
  ('ADMIN','Administrator — full operational access'),
  ('SUPER_ADMIN','Super administrator — user, role, and system management')
on conflict (name) do nothing;

insert into permissions (code, description) values
  ('profile:read','Read profile'),
  ('profile:update:own','Update own profile'),
  ('orders:read:own','Read own orders'),
  ('orders:read','Read all orders'),
  ('orders:create','Create orders'),
  ('orders:update:status','Update order status'),
  ('orders:update:status:limited','Limited order status updates'),
  ('payments:create:own','Create payments'),
  ('payments:read','Read all payments'),
  ('tickets:create','Create tickets'),
  ('tickets:read','Read tickets'),
  ('tickets:update','Update tickets'),
  ('users:read','Read users'),
  ('users:update','Update users'),
  ('services:read','Read services'),
  ('services:create','Create services'),
  ('services:update','Update services'),
  ('categories:read','Read categories'),
  ('categories:create','Create categories'),
  ('categories:update','Update categories'),
  ('providers:read','Read providers'),
  ('providers:update','Update providers'),
  ('refunds:read','Read refunds'),
  ('refunds:update','Update refunds'),
  ('notifications:read','Read notifications'),
-- Role-permission grants (least privilege)
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r, permissions p
where (r.name, p.code) in
  (('CUSTOMER','profile:read'),('CUSTOMER','profile:update:own'),('CUSTOMER','orders:read:own'),
   ('CUSTOMER','orders:create'),('CUSTOMER','payments:create:own'),('CUSTOMER','tickets:create'),
   ('SUPPORT','profile:read'),('SUPPORT','profile:update:own'),('SUPPORT','orders:read'),
   ('SUPPORT','orders:update:status:limited'),('SUPPORT','tickets:read'),('SUPPORT','tickets:update'),
   ('SUPPORT','users:read'),
   ('ADMIN','profile:read'),('ADMIN','profile:update'),('ADMIN','users:read'),('ADMIN','users:update'),
   ('ADMIN','orders:read'),('ADMIN','orders:update:status'),('ADMIN','services:read'),('ADMIN','services:create'),
   ('ADMIN','services:update'),('ADMIN','categories:read'),('ADMIN','categories:create'),('ADMIN','categories:update'),
   ('ADMIN','providers:read'),('ADMIN','providers:update'),('ADMIN','payments:read'),('ADMIN','refunds:read'),
   ('ADMIN','refunds:update'),('ADMIN','tickets:read'),('ADMIN','tickets:update'),('ADMIN','notifications:read'),
   ('ADMIN','settings:read'),('ADMIN','reports:read'),('ADMIN','audit-logs:read'),
   ('SUPER_ADMIN','profile:read'),('SUPER_ADMIN','profile:update'),('SUPER_ADMIN','users:read'),
   ('SUPER_ADMIN','users:update'),('SUPER_ADMIN','users:delete'),('SUPER_ADMIN','roles:read'),
   ('SUPER_ADMIN','roles:update'),('SUPER_ADMIN','orders:read'),('SUPER_ADMIN','orders:update:status'),
   ('SUPER_ADMIN','orders:delete'),('SUPER_ADMIN','services:read'),('SUPER_ADMIN','services:create'),
   ('SUPER_ADMIN','services:update'),('SUPER_ADMIN','services:delete'),('SUPER_ADMIN','categories:read'),
   ('SUPER_ADMIN','categories:create'),('SUPER_ADMIN','categories:update'),('SUPER_ADMIN','categories:delete'),
   ('SUPER_ADMIN','providers:read'),('SUPER_ADMIN','providers:create'),('SUPER_ADMIN','providers:update'),
   ('SUPER_ADMIN','providers:delete'),('SUPER_ADMIN','payments:read'),('SUPER_ADMIN','refunds:read'),
   ('SUPER_ADMIN','refunds:update'),('SUPER_ADMIN','refunds:create'),('SUPER_ADMIN','tickets:read'),
   ('SUPER_ADMIN','tickets:update'),('SUPER_ADMIN','tickets:delete'),('SUPER_ADMIN','notifications:read'),
   ('SUPER_ADMIN','notifications:create'),('SUPER_ADMIN','settings:read'),('SUPER_ADMIN','settings:update'),
   ('SUPER_ADMIN','reports:read'),('SUPER_ADMIN','reports:create'),('SUPER_ADMIN','audit-logs:read'),
   ('SUPER_ADMIN','audit-logs:export'),('SUPER_ADMIN','security:read'),('SUPER_ADMIN','security:update'))
on conflict do nothing;

insert into categories (name, slug, description, sort_order) values
  ('Instagram','instagram','Instagram content promotion campaigns',1),
  ('TikTok','tiktok','TikTok content promotion campaigns',2),
  ('YouTube','youtube','YouTube content promotion campaigns',3),
  ('Facebook','facebook','Facebook content promotion campaigns',4),
  ('Telegram','telegram','Telegram channel promotion',5),
  ('X','x','X (formerly Twitter) content promotion',6),
  ('Analytics','analytics','Analytics and reporting services',7)
on conflict (slug) do nothing;

insert into providers (name, adapter_type, is_active, credentials_configured) values
  ('Manual Fulfillment','manual', true, false),
  ('Mock Provider (test)','mock', true, false)
on conflict (name) do nothing;
  ('settings:read','Read settings'),
  ('reports:read','Read reports'),
-- Dev seed services (seed_data = true). Inactive by default; enable only after
-- compliance review and real pricing is established.
with cat as (select id, slug from categories),
     prov as (select id from providers where adapter_type = 'manual' limit 1)
insert into services (category_id, name, description, platform, price_cents, currency,
                      min_quantity, max_quantity, is_active, fulfillment_method, provider_id,
                      estimated_delivery, seed_data, created_at, updated_at)
select c.id,
       'Dev: ' || initcap(c.slug) || ' Starter',
       'Development seed service. Not a commercial offer. Verify platform policy compliance before enabling.',
       initcap(c.slug),
       500, 'USD', 10, 1000, false, 'manual', prov.id,
       '1-3 business days (estimated, unverified)', true,
       now(), now()
from cat c, prov
on conflict do nothing;

insert into exchange_rates (base_currency, target_currency, rate, updated_at) values
  ('USD','MAD', 10.0000000000, now()),
  ('USD','EUR', 0.9200000000, now()),
  ('MAD','USD', 0.1000000000, now()),
  ('EUR','USD', 1.0869565217, now())
on conflict (base_currency, target_currency) do nothing;
  ('audit-logs:read','Read audit logs')
on conflict (code) do nothing;