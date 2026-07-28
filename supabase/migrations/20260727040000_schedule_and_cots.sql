-- ============================================================================
-- 4everOPS — Schedule stops (with map links) + cot tracker
-- ============================================================================
-- Run after 20260727030000_daily_ops.sql.
--
-- Schedule stops: a day's addresses (trip location, lunch spot, hotel), so
-- staff can plan the route and tap straight into Google Maps/Waze — built
-- app-side from the plain address string, no API key needed.
--
-- Cot loans: extra beds given out for a room have to come back. Same
-- give-it-out/track-the-return shape as the merch tracker planned for
-- later, small enough to build now.
-- ============================================================================

create table public.schedule_stops (
  id uuid primary key default gen_random_uuid(),
  travel_date date not null,
  label text not null,
  address text not null,
  time time,
  notes text,
  sort_order int not null default 0,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index schedule_stops_travel_date_idx on public.schedule_stops(travel_date);

alter table public.schedule_stops enable row level security;

create policy "schedule_stops_select_all" on public.schedule_stops
  for select using (auth.role() = 'authenticated');

create policy "schedule_stops_insert" on public.schedule_stops
  for insert with check (public.is_oversight());

create policy "schedule_stops_update" on public.schedule_stops
  for update using (public.is_oversight());

create policy "schedule_stops_delete" on public.schedule_stops
  for delete using (public.is_oversight());

create table public.cot_loans (
  id uuid primary key default gen_random_uuid(),
  room_or_group text not null,
  given_at timestamptz not null default now(),
  given_by uuid not null references public.profiles(id),
  returned_at timestamptz,
  returned_by uuid references public.profiles(id),
  notes text
);

create index cot_loans_outstanding_idx on public.cot_loans(returned_at);

alter table public.cot_loans enable row level security;

-- Everyone signed in can see and manage cots — small trusted team, and
-- Support (who physically hands them out) shouldn't need oversight to log
-- or clear one, same reasoning as the tasks/checklist-item model already
-- in place for department work.
create policy "cot_loans_select_all" on public.cot_loans
  for select using (auth.role() = 'authenticated');

create policy "cot_loans_insert" on public.cot_loans
  for insert with check (given_by = auth.uid());

create policy "cot_loans_update" on public.cot_loans
  for update using (auth.role() = 'authenticated');

create policy "cot_loans_delete" on public.cot_loans
  for delete using (public.is_oversight());

do $$
begin
  begin
    alter publication supabase_realtime add table public.schedule_stops;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.cot_loans;
  exception when duplicate_object then null;
  end;
end;
$$;
