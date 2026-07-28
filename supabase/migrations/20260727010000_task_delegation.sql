-- ============================================================================
-- 4everOPS — Open task creation to everyone, not just directors
-- ============================================================================
-- Tasks now cover two real-world cases that are the same underlying thing:
-- the jobs a director assigns each morning, and ad-hoc tasks anyone logs
-- during the day. Any active staff member can now create a task for
-- themselves or a colleague; directors keep full oversight of everything.
-- ============================================================================

drop policy if exists "tasks_insert_director" on public.tasks;

create policy "tasks_insert" on public.tasks
  for insert with check (assigned_by = auth.uid());

-- A task's creator can now see it even if they assigned it to someone else
-- (previously only the assignee or a director could).
drop policy if exists "tasks_select" on public.tasks;

create policy "tasks_select" on public.tasks
  for select using (
    assigned_to = auth.uid()
    or assigned_by = auth.uid()
    or public.current_user_role() = 'director'
  );

drop policy if exists "tasks_update" on public.tasks;

create policy "tasks_update" on public.tasks
  for update using (
    assigned_to = auth.uid()
    or assigned_by = auth.uid()
    or public.current_user_role() = 'director'
  );

drop policy if exists "tasks_delete_director" on public.tasks;

create policy "tasks_delete" on public.tasks
  for delete using (
    assigned_by = auth.uid() or public.current_user_role() = 'director'
  );

-- The creator gets a heads-up when their task actually gets finished — not
-- needed when someone just made the task for themselves.
create or replace function public.notify_creator_on_task_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed'
     and old.status is distinct from 'completed'
     and new.assigned_by <> new.assigned_to then
    insert into public.notifications (user_id, type, title, body, related_table, related_id)
    values (
      new.assigned_by,
      'task_completed',
      'Completed: ' || new.title,
      null,
      'tasks',
      new.id
    );
  end if;
  return new;
end;
$$;

create trigger tasks_notify_creator_on_completed
  after update on public.tasks
  for each row execute function public.notify_creator_on_task_completed();
