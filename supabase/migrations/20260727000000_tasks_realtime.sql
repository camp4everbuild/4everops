-- ============================================================================
-- 4everOPS — Realtime for tasks
-- ============================================================================
-- The tasks page moved to a live-subscribed client (optimistic updates for
-- your own actions, realtime for everyone else's) instead of router.refresh()
-- round-trips. RLS (tasks_select) already scopes what each subscriber can see.
-- ============================================================================

do $$
begin
  begin
    alter publication supabase_realtime add table public.tasks;
  exception when duplicate_object then null;
  end;
end;
$$;
