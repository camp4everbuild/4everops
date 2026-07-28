-- ============================================================================
-- 4everOPS — Notify on checklist item assignment
-- ============================================================================
-- Tasks and jobs notify their assignee; checklist items never did — director/
-- head could assign a department item to a specific person and that person
-- had no way of knowing except stumbling onto Today. Fires on the initial
-- insert (a template clone or manual add with an assignee already set) and
-- on a later assignment/reassignment.
-- ============================================================================

create or replace function public.notify_on_checklist_item_assigned()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_to is not null
     and (tg_op = 'INSERT' or new.assigned_to is distinct from old.assigned_to) then
    insert into public.notifications (user_id, type, title, body, related_table, related_id)
    values (
      new.assigned_to,
      'task_assigned',
      'You were assigned: ' || new.title,
      null,
      'checklist_items',
      new.id
    );
  end if;
  return new;
end;
$$;

create trigger checklist_items_notify_assigned
  after insert or update on public.checklist_items
  for each row execute function public.notify_on_checklist_item_assigned();
