-- ============================================================================
-- 4everOPS — Security corrections, notification triggers, claim RPC
-- ============================================================================
-- Run this AFTER the initial schema. It fixes three real holes in v1 and adds
-- the server-side pieces the app depends on.
-- ============================================================================


-- ============================================================================
-- 1. PRIVILEGE ESCALATION (critical)
-- ============================================================================
-- `profiles_update_self_or_director` had no WITH CHECK, so Postgres reused the
-- USING clause as the check. `id = auth.uid()` is still true after an update
-- that sets role = 'director', which means ANY logged-in user could promote
-- themselves with a single API call:
--     supabase.from('profiles').update({ role: 'director' }).eq('id', myId)
-- A WITH CHECK clause can't fix this on its own (it can't see OLD.role), so we
-- gate the column with a trigger instead.

create or replace function public.enforce_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Service role (director admin actions) and direct SQL access are trusted.
  -- When auth.uid() is null there is no row an anon caller could reach anyway,
  -- because the RLS policy requires id = auth.uid().
  if current_user = 'service_role' or auth.uid() is null then
    return new;
  end if;

  if new.role is distinct from old.role
     and public.current_user_role() is distinct from 'director' then
    raise exception 'Only a director can change a user role';
  end if;

  return new;
end;
$$;

create trigger profiles_enforce_role_change
  before update on public.profiles
  for each row execute function public.enforce_profile_role_change();

-- Make the check explicit as well, so a self-update can never retarget another
-- row by rewriting the primary key.
drop policy if exists "profiles_update_self_or_director" on public.profiles;

create policy "profiles_update_self_or_director" on public.profiles
  for update
  using  (id = auth.uid() or public.current_user_role() = 'director')
  with check (id = auth.uid() or public.current_user_role() = 'director');


-- ============================================================================
-- 2. SIGNUP ROLE SPOOFING
-- ============================================================================
-- handle_new_user() read the role from raw_user_meta_data, which is fully
-- client-controlled at signup — anyone hitting /auth/v1/signup could hand
-- themselves 'director'. raw_app_meta_data can only be written by the service
-- role, so it is the trustworthy place to carry an invited role.
-- The very first account to exist is bootstrapped as director so you can get
-- into the admin screen; everything after that is invite-only.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role user_role;
  v_existing int;
begin
  select count(*) into v_existing from public.profiles;

  if v_existing = 0 then
    v_role := 'director';
  else
    v_role := coalesce((new.raw_app_meta_data ->> 'role')::user_role, 'support_staff');
  end if;

  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), new.email),
    v_role
  );

  return new;
end;
$$;

-- Pin the search_path on the role helper too — a security definer function
-- without one is resolvable against a caller-controlled schema.
create or replace function public.current_user_role()
returns user_role
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;


-- ============================================================================
-- 3. CAMPER NOTES LEAK
-- ============================================================================
-- `campers_public` was a plain view. Views execute with their owner's rights
-- and are NOT subject to the underlying table's RLS, and Supabase grants
-- select on public-schema objects to `anon` by default — so camper names,
-- cabins and counselor assignments were readable with nothing but the anon key.
--
-- Splitting the sensitive column into its own RLS-protected table is safer than
-- patching the view: the roster becomes ordinary readable data, and `notes`
-- lives somewhere that can enforce "director or that camper's counselor" for
-- real. Column-level grants can't express that, because directors and
-- counselors are both the `authenticated` Postgres role.

create table public.camper_notes (
  camper_id uuid primary key references public.campers(id) on delete cascade,
  notes text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

insert into public.camper_notes (camper_id, notes)
  select id, notes from public.campers where notes is not null and notes <> '';

drop view if exists public.campers_public;
alter table public.campers drop column notes;

alter table public.camper_notes enable row level security;

-- Roster fields are now safe for any signed-in staff member to read.
drop policy if exists "campers_select" on public.campers;

create policy "campers_select_all" on public.campers
  for select using (auth.role() = 'authenticated');

create policy "camper_notes_select" on public.camper_notes
  for select using (
    public.current_user_role() = 'director'
    or exists (
      select 1 from public.campers c
      where c.id = camper_notes.camper_id and c.counselor_id = auth.uid()
    )
  );

create policy "camper_notes_insert" on public.camper_notes
  for insert with check (
    public.current_user_role() = 'director'
    or exists (
      select 1 from public.campers c
      where c.id = camper_notes.camper_id and c.counselor_id = auth.uid()
    )
  );

create policy "camper_notes_update" on public.camper_notes
  for update using (
    public.current_user_role() = 'director'
    or exists (
      select 1 from public.campers c
      where c.id = camper_notes.camper_id and c.counselor_id = auth.uid()
    )
  );


-- ============================================================================
-- 4. MISSING POLICIES
-- ============================================================================
-- RLS denies by default, so every table without a DELETE policy was
-- undeletable by anyone — including directors. Same for a few UPDATEs.

create policy "campers_delete_director" on public.campers
  for delete using (public.current_user_role() = 'director');

create policy "camper_notes_delete_director" on public.camper_notes
  for delete using (public.current_user_role() = 'director');

create policy "checklists_update_director" on public.checklists
  for update using (public.current_user_role() = 'director');

create policy "checklists_delete_director" on public.checklists
  for delete using (public.current_user_role() = 'director');

create policy "checklist_items_delete_director" on public.checklist_items
  for delete using (public.current_user_role() = 'director');

create policy "announcements_update_director" on public.announcements
  for update using (public.current_user_role() = 'director');

create policy "announcements_delete_director" on public.announcements
  for delete using (public.current_user_role() = 'director');

create policy "travel_days_delete_director" on public.travel_days
  for delete using (public.current_user_role() = 'director');

create policy "open_jobs_delete" on public.open_jobs
  for delete using (
    public.current_user_role() = 'director' or created_by = auth.uid()
  );

create policy "notifications_delete_own" on public.notifications
  for delete using (user_id = auth.uid());

-- Tighten open job updates. Previously ANY authenticated user could rewrite ANY
-- job row — including reassigning someone else's claim or editing the title.
-- Claiming now goes through claim_open_job() below, which is security definer
-- and therefore doesn't need a blanket update policy to work.
drop policy if exists "open_jobs_update_claim" on public.open_jobs;

create policy "open_jobs_update" on public.open_jobs
  for update using (
    public.current_user_role() = 'director'
    or created_by = auth.uid()
    or claimed_by = auth.uid()
  );


-- ============================================================================
-- 5. CLAIM RACE
-- ============================================================================
-- Two people tapping "Claim" at the same time both passed a plain UPDATE. The
-- row lock makes the second one lose cleanly and get told why.

create or replace function public.claim_open_job(p_job_id uuid)
returns public.open_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.open_jobs;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_job from public.open_jobs where id = p_job_id for update;

  if not found then
    raise exception 'Job not found';
  end if;

  if v_job.status <> 'open' then
    raise exception 'Job was already claimed';
  end if;

  update public.open_jobs
     set status = 'claimed',
         claimed_by = auth.uid(),
         claimed_at = now()
   where id = p_job_id
  returning * into v_job;

  return v_job;
end;
$$;

revoke execute on function public.claim_open_job(uuid) from public, anon;
grant execute on function public.claim_open_job(uuid) to authenticated;


-- ============================================================================
-- 6. updated_at
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();


-- ============================================================================
-- 7. NOTIFICATION TRIGGERS
-- ============================================================================
-- `notifications` has no INSERT policy, so clients can't write to it at all —
-- which is what we want. These triggers are security definer, so they bypass
-- RLS and are the only thing that can enqueue. Doing it in the database rather
-- than app logic means a task assigned from the SQL editor still notifies.

create or replace function public.notify_on_task_assigned()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, body, related_table, related_id)
  values (
    new.assigned_to,
    'task_assigned',
    'New task: ' || new.title,
    new.description,
    'tasks',
    new.id
  );
  return new;
end;
$$;

create trigger tasks_notify_assignee
  after insert on public.tasks
  for each row execute function public.notify_on_task_assigned();


create or replace function public.notify_on_open_job()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, body, related_table, related_id)
  select p.id, 'job_posted', 'Open job: ' || new.title, new.description, 'open_jobs', new.id
  from public.profiles p
  where p.id <> new.created_by;
  return new;
end;
$$;

create trigger open_jobs_notify_all
  after insert on public.open_jobs
  for each row execute function public.notify_on_open_job();


create or replace function public.notify_on_announcement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, body, related_table, related_id)
  select p.id, 'announcement', new.title, new.body, 'announcements', new.id
  from public.profiles p
  where p.id <> new.created_by;
  return new;
end;
$$;

create trigger announcements_notify_all
  after insert on public.announcements
  for each row execute function public.notify_on_announcement();


create or replace function public.notify_on_travel_day_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, body, related_table, related_id)
  select p.id, 'schedule_change', 'Schedule updated for ' || to_char(new.travel_date, 'Mon DD'),
         coalesce(new.meeting_location, new.hotel_name), 'travel_days', new.id
  from public.profiles p;
  return new;
end;
$$;

create trigger travel_days_notify_all
  after update on public.travel_days
  for each row execute function public.notify_on_travel_day_change();


-- ============================================================================
-- 8. REALTIME
-- ============================================================================
-- The jobs board and the notification bell both subscribe. Adding a table that
-- is already in the publication is an error, hence the guard.

do $$
begin
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.open_jobs;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.checklist_items;
  exception when duplicate_object then null;
  end;
end;
$$;
