-- ============================================================================
-- 4everOPS — Numbered cot roster + schedule stop assignees
-- ============================================================================
-- Cots: cot_loans was an event log (log a loan, mark it returned, log the
-- next one). The real workflow is simpler — every physical cot/mattress has
-- a number, and staff just check it out and check it back in. Replacing the
-- log with a fixed, numbered roster + a current out/in state per cot.
--
-- Schedule: stops had no assignee at all — replacing "everyone can see it"
-- with "this specific person owns this stop," same assign/reassign pattern
-- already used for tasks and jobs.
-- ============================================================================

drop table public.cot_loans;

create table public.cots (
  id uuid primary key default gen_random_uuid(),
  number int not null unique,
  is_out boolean not null default false,
  room_or_group text,
  given_at timestamptz,
  given_by uuid references public.profiles(id),
  returned_at timestamptz,
  returned_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.cots enable row level security;

-- Everyone sees the roster. Adding/removing a numbered cot from inventory is
-- an oversight setup task; checking one out or back in is the frequent daily
-- action and stays open to any active staff member (same reasoning as the
-- old cot_loans policy — Support shouldn't need oversight to do this).
create policy "cots_select_all" on public.cots
  for select using (auth.role() = 'authenticated');

create policy "cots_insert" on public.cots
  for insert with check (public.is_oversight());

create policy "cots_update" on public.cots
  for update using (auth.role() = 'authenticated');

create policy "cots_delete" on public.cots
  for delete using (public.is_oversight());

do $$
begin
  begin
    alter publication supabase_realtime add table public.cots;
  exception when duplicate_object then null;
  end;
end;
$$;

alter table public.schedule_stops add column assigned_to uuid references public.profiles(id);
