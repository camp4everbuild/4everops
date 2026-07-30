-- ============================================================================
-- 4everOPS — Realtime audit log for the admin control center
-- ============================================================================
-- notifications is already in the realtime publication (from the very
-- first migration) — this just adds audit_log so the new events (logins,
-- deletions, resends, etc.) show up live on /admin without a refresh.
-- ============================================================================

do $$
begin
  begin
    alter publication supabase_realtime add table public.audit_log;
  exception when duplicate_object then null;
  end;
end;
$$;
