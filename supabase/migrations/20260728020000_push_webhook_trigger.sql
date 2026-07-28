-- ============================================================================
-- 4everOPS — Fire the push webhook straight from Postgres
-- ============================================================================
-- Supersedes the dashboard-configured Database Webhook from the previous
-- migration's comment — couldn't locate that UI, so doing it in SQL via
-- pg_net instead. Same effect: every new `notifications` row POSTs to
-- /api/push/send, which sends the actual push.
--
-- Trade-off worth knowing: the shared secret and the Vercel URL are now
-- inline in this file, which is committed to git. Acceptable here because
-- the repo is private and the worst case of a leaked secret is someone
-- POSTing bogus push-trigger requests to our own endpoint — not a real
-- security boundary like the service role key. If the repo ever goes
-- public, rotate PUSH_WEBHOOK_SECRET (in Vercel) and update this trigger
-- to match. If the Vercel domain changes, this trigger needs updating too.
-- ============================================================================

-- pg_net manages its own "net" schema on Supabase — don't pin it to a
-- different schema with `with schema ...` or its functions won't resolve.
create extension if not exists pg_net;

create or replace function public.send_push_on_notification()
returns trigger
language plpgsql
security definer
set search_path = public, net
as $$
begin
  perform net.http_post(
    url := 'https://4everops.vercel.app/api/push/send',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer 9d2f3b0cc6ae2ff41987d5e6d34ae4caf7715059517315d4610b895de3efbf40'
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'notifications',
      'record', jsonb_build_object(
        'user_id', new.user_id,
        'title', new.title,
        'body', new.body,
        'related_table', new.related_table
      )
    )
  );
  return new;
end;
$$;

create trigger notifications_send_push
  after insert on public.notifications
  for each row execute function public.send_push_on_notification();
