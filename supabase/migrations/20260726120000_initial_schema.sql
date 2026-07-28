-- ============================================================================
-- 4everOPS — Initial Schema
-- ============================================================================
-- NOTE: This migration is a record of the schema already applied by hand in the
-- Supabase SQL editor. It is checked in so `supabase db reset` can rebuild a
-- local database from scratch. See 20260726120001_security_and_rpc.sql for
-- corrections applied on top of it.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------

create type user_role as enum ('director', 'support_staff', 'counselor');
create type task_priority as enum ('low', 'medium', 'high', 'urgent');
create type task_status as enum ('pending', 'in_progress', 'completed');
create type job_status as enum ('open', 'claimed', 'in_progress', 'completed');

-- ----------------------------------------------------------------------------
-- PROFILES
-- Extends auth.users. One row per staff member / counselor / director.
-- ----------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  role user_role not null default 'support_staff',
  department text,
  tshirt_size text,
  room_assignment text,
  emergency_contact_name text,
  emergency_contact_phone text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'support_staff')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: get the calling user's role. Used throughout RLS policies below.
create or replace function public.current_user_role()
returns user_role
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- ----------------------------------------------------------------------------
-- ASSIGNED TASKS
-- ----------------------------------------------------------------------------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  assigned_to uuid not null references public.profiles(id),
  assigned_by uuid not null references public.profiles(id),
  due_at timestamptz,
  priority task_priority not null default 'medium',
  status task_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_assigned_to_idx on public.tasks(assigned_to);
create index tasks_status_idx on public.tasks(status);

-- ----------------------------------------------------------------------------
-- OPEN JOBS
-- ----------------------------------------------------------------------------

create table public.open_jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status job_status not null default 'open',
  created_by uuid not null references public.profiles(id),
  claimed_by uuid references public.profiles(id),
  claimed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index open_jobs_status_idx on public.open_jobs(status);

-- ----------------------------------------------------------------------------
-- CHECKLISTS
-- ----------------------------------------------------------------------------

create table public.checklists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  checklist_date date not null default current_date,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.checklists(id) on delete cascade,
  title text not null,
  assigned_to uuid references public.profiles(id),
  is_complete boolean not null default false,
  completed_by uuid references public.profiles(id),
  completed_at timestamptz,
  sort_order int not null default 0
);

create index checklist_items_checklist_id_idx on public.checklist_items(checklist_id);

-- ----------------------------------------------------------------------------
-- CAMPERS
-- ----------------------------------------------------------------------------

create table public.campers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  counselor_id uuid references public.profiles(id),
  parent_name text,
  parent_phone text,
  tshirt_size text,
  cabin_group text,
  notes text,
  created_at timestamptz not null default now()
);

create index campers_counselor_id_idx on public.campers(counselor_id);

create view public.campers_public as
  select id, full_name, counselor_id, cabin_group, tshirt_size
  from public.campers;

-- ----------------------------------------------------------------------------
-- ANNOUNCEMENTS
-- ----------------------------------------------------------------------------

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  created_by uuid not null references public.profiles(id),
  requires_ack boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.announcement_acknowledgments (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  acknowledged_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

-- ----------------------------------------------------------------------------
-- TRAVEL DAYS
-- ----------------------------------------------------------------------------

create table public.travel_days (
  id uuid primary key default gen_random_uuid(),
  travel_date date not null unique,
  hotel_name text,
  hotel_address text,
  check_in_time timestamptz,
  check_out_time timestamptz,
  departure_time timestamptz,
  meeting_location text,
  itinerary text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS
-- ----------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  type text not null,
  title text not null,
  body text,
  related_table text,
  related_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications(user_id, is_read);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.open_jobs enable row level security;
alter table public.checklists enable row level security;
alter table public.checklist_items enable row level security;
alter table public.campers enable row level security;
alter table public.announcements enable row level security;
alter table public.announcement_acknowledgments enable row level security;
alter table public.travel_days enable row level security;
alter table public.notifications enable row level security;

create policy "profiles_select_all" on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "profiles_update_self_or_director" on public.profiles
  for update using (
    id = auth.uid() or public.current_user_role() = 'director'
  );

create policy "tasks_select" on public.tasks
  for select using (
    assigned_to = auth.uid() or public.current_user_role() = 'director'
  );

create policy "tasks_insert_director" on public.tasks
  for insert with check (public.current_user_role() = 'director');

create policy "tasks_update" on public.tasks
  for update using (
    assigned_to = auth.uid() or public.current_user_role() = 'director'
  );

create policy "tasks_delete_director" on public.tasks
  for delete using (public.current_user_role() = 'director');

create policy "open_jobs_select_all" on public.open_jobs
  for select using (auth.role() = 'authenticated');

create policy "open_jobs_insert" on public.open_jobs
  for insert with check (
    public.current_user_role() in ('director', 'support_staff')
  );

create policy "open_jobs_update_claim" on public.open_jobs
  for update using (auth.role() = 'authenticated');

create policy "checklists_select_all" on public.checklists
  for select using (auth.role() = 'authenticated');

create policy "checklists_insert_director" on public.checklists
  for insert with check (public.current_user_role() = 'director');

create policy "checklist_items_select_all" on public.checklist_items
  for select using (auth.role() = 'authenticated');

create policy "checklist_items_update" on public.checklist_items
  for update using (
    assigned_to = auth.uid() or public.current_user_role() = 'director'
  );

create policy "checklist_items_insert_director" on public.checklist_items
  for insert with check (public.current_user_role() = 'director');

create policy "campers_select" on public.campers
  for select using (
    public.current_user_role() = 'director'
    or counselor_id = auth.uid()
  );

create policy "campers_insert_update_director" on public.campers
  for insert with check (public.current_user_role() = 'director');

create policy "campers_update_director" on public.campers
  for update using (public.current_user_role() = 'director');

create policy "announcements_select_all" on public.announcements
  for select using (auth.role() = 'authenticated');

create policy "announcements_insert_director" on public.announcements
  for insert with check (public.current_user_role() = 'director');

create policy "acks_select" on public.announcement_acknowledgments
  for select using (
    user_id = auth.uid() or public.current_user_role() = 'director'
  );

create policy "acks_insert_own" on public.announcement_acknowledgments
  for insert with check (user_id = auth.uid());

create policy "travel_days_select_all" on public.travel_days
  for select using (auth.role() = 'authenticated');

create policy "travel_days_insert_director" on public.travel_days
  for insert with check (public.current_user_role() = 'director');

create policy "travel_days_update_director" on public.travel_days
  for update using (public.current_user_role() = 'director');

create policy "notifications_select_own" on public.notifications
  for select using (user_id = auth.uid());

create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid());
