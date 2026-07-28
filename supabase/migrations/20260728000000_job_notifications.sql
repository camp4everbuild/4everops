-- ============================================================================
-- 4everOPS — Job status notifications
-- ============================================================================
-- notify_on_open_job() (from the very first migration) already notifies
-- everyone except the poster when a job goes up. This adds the other two
-- legs: the claimer gets a confirmation the moment they're assigned, and
-- the poster — and only the poster — gets notified on every status change
-- after that, so they can track their own job without being spammed with
-- everyone else's.
-- ============================================================================

create or replace function public.notify_on_job_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    -- The person who just got assigned gets their own confirmation.
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

    -- The poster hears about every step, from whoever's working it — unless
    -- they're the one who caused this change themselves.
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

create trigger open_jobs_notify_status_change
  after update on public.open_jobs
  for each row execute function public.notify_on_job_status_change();
