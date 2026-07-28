-- ============================================================================
-- 4everOPS — Daily Ops: checklist templates + department-scoped visibility
-- ============================================================================
-- Run after 20260727020001_multi_role_departments.sql.
--
-- The daily routine (bus prep, merch, lunch handoff, dinner, merch return)
-- repeats every single day with the same shape, so directors/heads define
-- it once as a template and "start today" clones it into a real checklist.
-- Checklist items are tagged with a department: oversight (director/heads)
-- sees everything, department staff see their department's items even if a
-- specific item isn't assigned to them personally — matches "kitchen sees
-- kitchen's stuff." Items can still be assigned to one specific person on
-- top of that, same as tasks already separate "who can see it" from "who
-- it's for."
-- ============================================================================

create type department as enum ('counselors', 'support', 'kitchen');

alter table public.checklist_items add column department department;
update public.checklist_items set department = 'support' where department is null;
alter table public.checklist_items alter column department set not null;

-- ----------------------------------------------------------------------------
-- TEMPLATES
-- ----------------------------------------------------------------------------

create table public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.checklist_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.checklist_templates(id) on delete cascade,
  title text not null,
  department department not null,
  sort_order int not null default 0
);

create index checklist_template_items_template_id_idx on public.checklist_template_items(template_id);

alter table public.checklist_templates enable row level security;
alter table public.checklist_template_items enable row level security;

-- Templates are a planning tool — oversight only, same as before for checklists.
create policy "checklist_templates_select" on public.checklist_templates
  for select using (public.is_oversight());
create policy "checklist_templates_insert" on public.checklist_templates
  for insert with check (public.is_oversight());
create policy "checklist_templates_update" on public.checklist_templates
  for update using (public.is_oversight());
create policy "checklist_templates_delete" on public.checklist_templates
  for delete using (public.is_oversight());

create policy "checklist_template_items_select" on public.checklist_template_items
  for select using (public.is_oversight());
create policy "checklist_template_items_insert" on public.checklist_template_items
  for insert with check (public.is_oversight());
create policy "checklist_template_items_update" on public.checklist_template_items
  for update using (public.is_oversight());
create policy "checklist_template_items_delete" on public.checklist_template_items
  for delete using (public.is_oversight());

-- ----------------------------------------------------------------------------
-- DEPARTMENT-SCOPED VISIBILITY ON THE REAL DAILY CHECKLIST
-- ----------------------------------------------------------------------------
-- The checklist container itself (just a date + name) stays visible to
-- anyone signed in; the items — which reveal actual department work — are
-- what get scoped.

drop policy if exists "checklist_items_select_all" on public.checklist_items;
create policy "checklist_items_select" on public.checklist_items
  for select using (
    public.is_oversight() or department::text = any(public.current_user_departments())
  );

drop policy if exists "checklist_items_update" on public.checklist_items;
create policy "checklist_items_update" on public.checklist_items
  for update using (
    assigned_to = auth.uid()
    or public.is_oversight()
    or department::text = any(public.current_user_departments())
  );

-- ----------------------------------------------------------------------------
-- "START TODAY" — clone a template into a real checklist for today, once
-- ----------------------------------------------------------------------------

create or replace function public.start_today_checklist(p_template_id uuid)
returns public.checklists
language plpgsql
security definer
set search_path = public
as $$
declare
  v_checklist public.checklists;
begin
  if not public.is_oversight() then
    raise exception 'Only a director or head can start today''s checklist';
  end if;

  select * into v_checklist from public.checklists where checklist_date = current_date;

  if found then
    return v_checklist;
  end if;

  insert into public.checklists (name, checklist_date, created_by)
  values ('Today', current_date, auth.uid())
  returning * into v_checklist;

  insert into public.checklist_items (checklist_id, title, department, sort_order)
  select v_checklist.id, title, department, sort_order
  from public.checklist_template_items
  where template_id = p_template_id
  order by sort_order;

  return v_checklist;
end;
$$;

revoke execute on function public.start_today_checklist(uuid) from public, anon;
grant execute on function public.start_today_checklist(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- REALTIME — checklist_items was already added in the first migration;
-- add the container too so a fresh "Today" appearing shows up live.
-- ----------------------------------------------------------------------------

do $$
begin
  begin
    alter publication supabase_realtime add table public.checklists;
  exception when duplicate_object then null;
  end;
end;
$$;
