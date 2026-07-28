-- ============================================================================
-- 4everOPS — CSV staging table + clearer assignment notification copy
-- ============================================================================
-- Tasks and kitchen-menu CSVs land here first, not straight into tasks/
-- open_jobs — a director/head reviews each row afterward and either posts it
-- to the open jobs board or assigns it to a specific person. Nothing here is
-- staff-facing; only oversight ever sees this table.
--
-- Also tightens up notification/push copy: "New task: X" didn't actually say
-- what happened. Push reuses the same title/body as the in-app notification
-- (see the webhook trigger), so fixing this once fixes both.
-- ============================================================================

create table public.pending_imports (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  batch_label text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index pending_imports_created_at_idx on public.pending_imports(created_at);

alter table public.pending_imports enable row level security;

create policy "pending_imports_select" on public.pending_imports
  for select using (public.is_oversight());

create policy "pending_imports_insert" on public.pending_imports
  for insert with check (public.is_oversight() and created_by = auth.uid());

create policy "pending_imports_delete" on public.pending_imports
  for delete using (public.is_oversight());

do $$
begin
  begin
    alter publication supabase_realtime add table public.pending_imports;
  exception when duplicate_object then null;
  end;
end;
$$;

-- ----------------------------------------------------------------------------
-- Clearer "you were assigned" copy — same text shows up in-app and in the
-- push notification, so this fixes both at once.
-- ----------------------------------------------------------------------------

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
    'You were assigned: ' || new.title,
    new.description,
    'tasks',
    new.id
  );
  return new;
end;
$$;

create or replace function public.notify_on_task_reassigned()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_to is distinct from old.assigned_to then
    insert into public.notifications (user_id, type, title, body, related_table, related_id)
    values (
      new.assigned_to,
      'task_assigned',
      'You were assigned: ' || new.title,
      new.description,
      'tasks',
      new.id
    );
  end if;
  return new;
end;
$$;

create or replace function public.notify_on_job_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status or new.claimed_by is distinct from old.claimed_by then
    if new.status = 'claimed' and new.claimed_by is not null then
      insert into public.notifications (user_id, type, title, body, related_table, related_id)
      values (
        new.claimed_by,
        'job_assigned',
        'You were assigned: ' || new.title,
        null,
        'open_jobs',
        new.id
      );
    end if;

    if new.created_by is distinct from new.claimed_by then
      insert into public.notifications (user_id, type, title, body, related_table, related_id)
      values (
        new.created_by,
        'job_status_change',
        case new.status
          when 'claimed' then (select full_name from public.profiles where id = new.claimed_by) || ' claimed: ' || new.title
          when 'in_progress' then (select full_name from public.profiles where id = new.claimed_by) || ' started: ' || new.title
          when 'completed' then (select full_name from public.profiles where id = new.claimed_by) || ' completed: ' || new.title
          else new.title
        end,
        null,
        'open_jobs',
        new.id
      );
    end if;
  end if;

  return new;
end;
$$;
