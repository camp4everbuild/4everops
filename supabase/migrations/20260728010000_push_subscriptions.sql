-- ============================================================================
-- 4everOPS — Web Push subscriptions
-- ============================================================================
-- Each row is one device's push endpoint. A person can have several (phone
-- + laptop). Sending happens outside Postgres: a Supabase Database Webhook
-- (configured in the dashboard, not here — keeps the shared secret out of
-- version control) POSTs every new `notifications` row to /api/push/send,
-- which looks up the recipient's subscriptions here and sends via web-push.
-- ============================================================================

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select using (user_id = auth.uid());

create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert with check (user_id = auth.uid());

create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete using (user_id = auth.uid());
