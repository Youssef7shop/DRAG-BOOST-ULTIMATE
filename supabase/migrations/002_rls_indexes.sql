-- =============================================================================
-- DRAG BOOST — Migration 002: RLS policies, indexes, triggers, grants
-- =============================================================================

-- Indexes
create index idx_profiles_role on profiles(role);
create index idx_profiles_status on profiles(status);
create index idx_categories_slug on categories(slug);
create index idx_categories_active on categories(is_active);
create index idx_services_category on services(category_id);
create index idx_services_platform on services(platform);
create index idx_services_active on services(is_active);
create index idx_orders_user on orders(user_id);
create index idx_orders_status on orders(status);
create index idx_orders_service on orders(service_id);
create index idx_orders_created on orders(created_at desc);
create index idx_order_events_order on order_events(order_id);
create index idx_payments_user on payments(user_id);
create index idx_payments_order on payments(order_id);
create index idx_payments_status on payments(status);
create index idx_transactions_user on transactions(user_id);
create index idx_transactions_order on transactions(order_id);
create index idx_refunds_payment on refunds(payment_id);
create index idx_tickets_user on support_tickets(user_id);
create index idx_ticket_messages_ticket on ticket_messages(ticket_id);
create index idx_notifications_user on notifications(user_id);
create index idx_audit_logs_actor on audit_logs(actor_user_id);
create index idx_audit_logs_target on audit_logs(target_type, target_id);
create index idx_idempotency_user on idempotency_keys(user_id);
create index idx_webhook_events_provider on webhook_events(provider, external_id);

-- Updated-at trigger function
create or replace function set_updated_at()
returns trigger as $$
begin
-- Enable RLS on all user-facing tables
alter table profiles enable row level security;
alter table categories enable row level security;
alter table services enable row level security;
alter table providers enable row level security;
alter table provider_services enable row level security;
alter table orders enable row level security;
alter table order_events enable row level security;
alter table payments enable row level security;
alter table transactions enable row level security;
alter table refunds enable row level security;
alter table wallets enable row level security;
alter table support_tickets enable row level security;
alter table ticket_messages enable row level security;
alter table notifications enable row level security;
alter table site_settings enable row level security;
alter table audit_logs enable row level security;
alter table webhook_events enable row level security;
alter table idempotency_keys enable row level security;
alter table exchange_rates enable row level security;
alter table user_roles enable row level security;
alter table role_permissions enable row level security;

-- Helper: is the current authenticated user a staff member?
-- (role is stored server-side in profiles; clients cannot edit it directly)
create or replace function is_staff() returns boolean as $$
declare
  r text;
begin
  select role into r from profiles where id = auth.uid();
  return r in ('SUPPORT','ADMIN','SUPER_ADMIN');
end;
$$ language plpgsql stable;

-- ===== profiles =====
create policy profiles_select_own on profiles for select using (auth.uid() = id);
create policy profiles_select_staff on profiles for select using (is_staff());
create policy profiles_insert_own on profiles for insert with check (auth.uid() = id);
create policy profiles_update_own on profiles for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- ===== categories / services (public read) =====
create policy categories_select_public on categories for select using (is_active = true);
create policy categories_select_staff on categories for select using (is_staff());
create policy services_select_public on services for select using (is_active = true);
create policy services_select_staff on services for select using (is_staff());

-- ===== orders =====
create policy orders_select_own on orders for select using (auth.uid() = user_id);
create policy orders_select_staff on orders for select using (is_staff());
create policy orders_insert_own on orders for insert with check (auth.uid() = user_id);

-- ===== order_events =====
create policy order_events_select_own on order_events for select using (
  exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid())
);
create policy order_events_select_staff on order_events for select using (is_staff());

-- ===== payments =====
create policy payments_select_own on payments for select using (auth.uid() = user_id);
create policy payments_select_staff on payments for select using (is_staff());
create policy payments_insert_own on payments for insert with check (auth.uid() = user_id);

-- ===== transactions =====
create policy transactions_select_own on transactions for select using (auth.uid() = user_id);
create policy transactions_select_staff on transactions for select using (is_staff());

-- ===== refunds =====
create policy refunds_select_own on refunds for select using (
  exists (select 1 from payments p where p.id = payment_id and p.user_id = auth.uid())
);
create policy refunds_select_staff on refunds for select using (is_staff());

-- ===== wallets =====
create policy wallets_select_own on wallets for select using (auth.uid() = user_id);

-- ===== support tickets =====
create policy tickets_select_own on support_tickets for select using (auth.uid() = user_id);
create policy tickets_select_staff on support_tickets for select using (is_staff());
create policy tickets_insert_own on support_tickets for insert with check (auth.uid() = user_id);

-- ===== ticket_messages =====
create policy ticket_messages_select_access on ticket_messages for select using (
  exists (select 1 from support_tickets t where t.id = ticket_id and (t.user_id = auth.uid() or is_staff()))
);
create policy ticket_messages_insert_own on ticket_messages for insert with check (auth.uid() = sender_id);

-- ===== notifications =====
create policy notifications_select_own on notifications for select using (auth.uid() = user_id);

-- ===== site_settings =====
create policy site_settings_select_public on site_settings for select using (true);

-- ===== audit_logs / webhook_events (staff / server only) =====
create policy audit_logs_select_staff on audit_logs for select using (is_staff());
create policy webhook_events_select_staff on webhook_events for select using (is_staff());

-- ===== idempotency_keys / exchange_rates =====
create policy idempotency_keys_select_own on idempotency_keys for select using (auth.uid() = user_id);
create policy exchange_rates_select_public on exchange_rates for select using (true);

-- ===== grants =====
grant usage on schema public to authenticated, anon;
grant select on all tables in schema public to authenticated;
grant insert on orders, order_events, payments, transactions, support_tickets, ticket_messages, notifications, profiles, idempotency_keys to authenticated;
grant update on profiles to authenticated;
grant select on all tables in schema public to anon;
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare tbl text;
begin
  for tbl in select tablename from pg_tables where schemaname = 'public'
    and tablename in ('profiles','categories','services','orders','payments','transactions',
                      'refunds','invoices','wallets','support_tickets','notifications','site_settings')
  loop
    execute format('create trigger trg_%I_updated_at before update on %I for each row execute function set_updated_at()', tbl, tbl);
  end loop;
end $$;