-- ============================================================================
-- 4everOPS — Multi-role staff + department model
-- ============================================================================
-- Run AFTER 20260727020000_new_roles.sql (separate transaction — see that
-- file for why).
--
-- Replaces the single `role` column with a `roles` array — staff can hold
-- more than one role (e.g. {head_support, kitchen_staff}). Adds Head roles
-- for each department (Counselors, Support, Kitchen): directors and heads
-- see everything ("oversight"); regular department staff see only their own
-- department's work, not just items personally assigned to them. This
-- powers the new daily-ops tables added in a later migration.
--
-- Every existing director-only policy keeps IDENTICAL behavior (director
-- only) — just re-expressed against the array. Nothing here grants heads
-- access to pre-existing resources (announcements, campers, travel_days,
-- etc.) beyond what directors already had; "oversight" access is reserved
-- for the department-scoped tables coming in the next migration.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. profiles.role -> profiles.roles (array)
-- ----------------------------------------------------------------------------

alter table public.profiles add column roles user_role[] not null default '{}';

update public.profiles set roles = array[role] where role is not null;

-- ----------------------------------------------------------------------------
-- 2. HELPERS
-- ----------------------------------------------------------------------------

create or replace function public.is_director()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select 'director' = any(roles) from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_oversight()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (
      select roles && array['director', 'head_counselor', 'head_support', 'head_kitchen']::user_role[]
      from public.profiles
      where id = auth.uid()
    ),
    false
  );
$$;

/** Which department a single role belongs to, or null (director isn't tied to one). */
create or replace function public.role_department(r user_role)
returns text
language sql
immutable
as $$
  select case r
    when 'counselor' then 'counselors'
    when 'head_counselor' then 'counselors'
    when 'support_staff' then 'support'
    when 'head_support' then 'support'
    when 'kitchen_staff' then 'kitchen'
    when 'head_kitchen' then 'kitchen'
    else null
  end;
$$;

/** Distinct departments the calling user belongs to, via any of their roles. */
create or replace function public.current_user_departments()
returns text[]
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    array_agg(distinct public.role_department(r)) filter (where public.role_department(r) is not null),
    '{}'
  )
  from public.profiles, unnest(roles) as r
  where id = auth.uid();
$$;

-- ----------------------------------------------------------------------------
-- 3. TRIGGERS — swap single-role logic for array logic
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing int;
  v_full_name text;
begin
  select count(*) into v_existing from public.profiles;

  v_full_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    new.email
  );

  if v_existing = 0 then
    insert into public.profiles (id, full_name, roles, status)
    values (new.id, v_full_name, array['director']::user_role[], 'active');
  else
    insert into public.profiles (id, full_name, roles, status)
    values (new.id, v_full_name, '{}', 'pending');
  end if;

  return new;
end;
$$;

create or replace function public.enforce_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_user = 'service_role' or auth.uid() is null then
    return new;
  end if;

  if new.roles is distinct from old.roles and not public.is_director() then
    raise exception 'Only a director can change a user role';
  end if;

  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. POLICIES — same access rules, rewritten against the array
-- ----------------------------------------------------------------------------

drop policy if exists "profiles_update_self_or_director" on public.profiles;
create policy "profiles_update_self_or_director" on public.profiles
  for update
  using  (id = auth.uid() or public.is_director())
  with check (id = auth.uid() or public.is_director());

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (
    id = auth.uid() or status = 'active' or public.is_director()
  );

drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks
  for select using (
    assigned_to = auth.uid() or assigned_by = auth.uid() or public.is_director()
  );

drop policy if exists "tasks_insert" on public.tasks;
create policy "tasks_insert" on public.tasks
  for insert with check (assigned_by = auth.uid());

drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update" on public.tasks
  for update using (
    assigned_to = auth.uid() or assigned_by = auth.uid() or public.is_director()
  );

drop policy if exists "tasks_delete" on public.tasks;
create policy "tasks_delete" on public.tasks
  for delete using (assigned_by = auth.uid() or public.is_director());

drop policy if exists "open_jobs_insert" on public.open_jobs;
create policy "open_jobs_insert" on public.open_jobs
  for insert with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and roles && array['director', 'support_staff']::user_role[]
    )
  );

drop policy if exists "open_jobs_delete" on public.open_jobs;
create policy "open_jobs_delete" on public.open_jobs
  for delete using (public.is_director() or created_by = auth.uid());

drop policy if exists "open_jobs_update" on public.open_jobs;
create policy "open_jobs_update" on public.open_jobs
  for update using (
    public.is_director() or created_by = auth.uid() or claimed_by = auth.uid()
  );

drop policy if exists "checklists_insert_director" on public.checklists;
create policy "checklists_insert_director" on public.checklists
  for insert with check (public.is_director());

drop policy if exists "checklists_update_director" on public.checklists;
create policy "checklists_update_director" on public.checklists
  for update using (public.is_director());

drop policy if exists "checklists_delete_director" on public.checklists;
create policy "checklists_delete_director" on public.checklists
  for delete using (public.is_director());

drop policy if exists "checklist_items_update" on public.checklist_items;
create policy "checklist_items_update" on public.checklist_items
  for update using (
    assigned_to = auth.uid() or public.is_director()
  );

drop policy if exists "checklist_items_insert_director" on public.checklist_items;
create policy "checklist_items_insert_director" on public.checklist_items
  for insert with check (public.is_director());

drop policy if exists "checklist_items_delete_director" on public.checklist_items;
create policy "checklist_items_delete_director" on public.checklist_items
  for delete using (public.is_director());

drop policy if exists "campers_insert_update_director" on public.campers;
create policy "campers_insert_update_director" on public.campers
  for insert with check (public.is_director());

drop policy if exists "campers_update_director" on public.campers;
create policy "campers_update_director" on public.campers
  for update using (public.is_director());

drop policy if exists "campers_delete_director" on public.campers;
create policy "campers_delete_director" on public.campers
  for delete using (public.is_director());

drop policy if exists "camper_notes_select" on public.camper_notes;
create policy "camper_notes_select" on public.camper_notes
  for select using (
    public.is_director()
    or exists (
      select 1 from public.campers c
      where c.id = camper_notes.camper_id and c.counselor_id = auth.uid()
    )
  );

drop policy if exists "camper_notes_insert" on public.camper_notes;
create policy "camper_notes_insert" on public.camper_notes
  for insert with check (
    public.is_director()
    or exists (
      select 1 from public.campers c
      where c.id = camper_notes.camper_id and c.counselor_id = auth.uid()
    )
  );

drop policy if exists "camper_notes_update" on public.camper_notes;
create policy "camper_notes_update" on public.camper_notes
  for update using (
    public.is_director()
    or exists (
      select 1 from public.campers c
      where c.id = camper_notes.camper_id and c.counselor_id = auth.uid()
    )
  );

drop policy if exists "camper_notes_delete_director" on public.camper_notes;
create policy "camper_notes_delete_director" on public.camper_notes
  for delete using (public.is_director());

drop policy if exists "announcements_insert_director" on public.announcements;
create policy "announcements_insert_director" on public.announcements
  for insert with check (public.is_director());

drop policy if exists "announcements_update_director" on public.announcements;
create policy "announcements_update_director" on public.announcements
  for update using (public.is_director());

drop policy if exists "announcements_delete_director" on public.announcements;
create policy "announcements_delete_director" on public.announcements
  for delete using (public.is_director());

drop policy if exists "acks_select" on public.announcement_acknowledgments;
create policy "acks_select" on public.announcement_acknowledgments
  for select using (user_id = auth.uid() or public.is_director());

drop policy if exists "travel_days_insert_director" on public.travel_days;
create policy "travel_days_insert_director" on public.travel_days
  for insert with check (public.is_director());

drop policy if exists "travel_days_update_director" on public.travel_days;
create policy "travel_days_update_director" on public.travel_days
  for update using (public.is_director());

drop policy if exists "travel_days_delete_director" on public.travel_days;
create policy "travel_days_delete_director" on public.travel_days
  for delete using (public.is_director());

-- ----------------------------------------------------------------------------
-- 5. Drop the old single-role column and helper now that nothing references them
-- ----------------------------------------------------------------------------

alter table public.profiles drop column role;
drop function if exists public.current_user_role();
