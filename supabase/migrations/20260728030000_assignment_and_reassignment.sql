-- ============================================================================
-- 4everOPS — Direct job assignment + task/job reassignment
-- ============================================================================
-- Previously a director/head could only watch jobs get self-claimed off the
-- open board, and nobody (not even a director) could hand a task or job to
-- a different person once it existed — tasks_update/open_jobs_update only
-- let is_director() through, not heads, and there was no "reassign" concept
-- at all. This widens both update policies to is_oversight() (director +
-- every head) and makes the existing notification triggers fire correctly
-- when a person is assigned/reassigned, not just on the original
-- insert/status-change paths.
-- ============================================================================

-- Heads need to see the whole task board to reassign anything on it, not
-- just the tasks they personally touch — matches is_oversight() everywhere
-- else oversight-level visibility is granted.
drop policy if exists "tasks_select" on public.tasks;
create policy "tasks_select" on public.tasks
  for select using (
    assigned_to = auth.uid() or assigned_by = auth.uid() or public.is_oversight()
  );

drop policy if exists "tasks_update" on public.tasks;
create policy "tasks_update" on public.tasks
  for update using (
    assigned_to = auth.uid() or assigned_by = auth.uid() or public.is_oversight()
  );

drop policy if exists "open_jobs_update" on public.open_jobs;
create policy "open_jobs_update" on public.open_jobs
  for update using (
    public.is_oversight() or created_by = auth.uid() or claimed_by = auth.uid()
  );

-- Reassigning a task (changing who it's assigned to) previously sent no
-- notification at all — only the original INSERT did. The new assignee now
-- hears about it the same way they would if the task were brand new.
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
      'New task: ' || new.title,
      new.description,
      'tasks',
      new.id
    );
  end if;
  return new;
end;
$$;

create trigger tasks_notify_reassigned
  after update on public.tasks
  for each row execute function public.notify_on_task_reassigned();

-- notify_on_job_status_change only fired the "claimed" notification when
-- status itself changed — so directly assigning an open job (open ->
-- claimed) worked, but reassigning an already-claimed job to someone else
-- (claimed -> claimed, just a different claimed_by) silently notified
-- nobody. Widened to fire on either status or claimed_by changing.
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
        'You''re on it: ' || new.title,
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
