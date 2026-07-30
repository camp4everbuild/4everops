-- ============================================================================
-- 4everOPS — Audit log + director visibility into everyone's notifications
-- ============================================================================
-- Backs the new /admin board: a record of who did what (role changes,
-- approvals, deletions, notification resends), and the ability for a
-- director to see and re-send anyone's notification, not just their own.
-- ============================================================================

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  -- Denormalized on purpose — an audit trail should still read sensibly if
  -- the actor's name later changes or their account is removed.
  actor_name text not null,
  action text not null,
  target_table text,
  target_id uuid,
  detail text,
  created_at timestamptz not null default now()
);

create index audit_log_created_at_idx on public.audit_log(created_at desc);

alter table public.audit_log enable row level security;

create policy "audit_log_select" on public.audit_log
  for select using (public.is_director());

create policy "audit_log_insert" on public.audit_log
  for insert with check (actor_id = auth.uid());

-- notifications_select_own (own rows only) already exists — this adds a
-- second, OR'd policy rather than replacing it, so a director additionally
-- sees everyone's.
create policy "notifications_select_director" on public.notifications
  for select using (public.is_director());
