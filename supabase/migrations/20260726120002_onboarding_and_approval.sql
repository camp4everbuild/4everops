-- ============================================================================
-- 4everOPS — Self-serve OAuth signup with director approval
-- ============================================================================
-- Adds a pending/active gate so new sign-ins (Google/Apple OAuth, or any
-- future signup path) land in a holding state until a director sets their
-- role. Run after 20260726120001_security_and_rpc.sql.
-- ============================================================================

create type profile_status as enum ('pending', 'active');

alter table public.profiles add column status profile_status not null default 'pending';
alter table public.profiles alter column role drop not null;
alter table public.profiles alter column role drop default;

-- Any rows that already have a role (the bootstrapped director) are staff.
update public.profiles set status = 'active' where role is not null;

-- New signups no longer read a role off metadata — approveUser()/inviteUser()
-- set it explicitly afterward via the profiles table, which
-- enforce_profile_role_change already trusts for directors and service_role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing int;
  v_full_name text;
begin
  select count(*) into v_existing from public.profiles;

  v_full_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    new.email
  );

  if v_existing = 0 then
    insert into public.profiles (id, full_name, role, status)
    values (new.id, v_full_name, 'director', 'active');
  else
    insert into public.profiles (id, full_name, role, status)
    values (new.id, v_full_name, null, 'pending');
  end if;

  return new;
end;
$$;

-- Pending users may only see their own row (so /pending can poll its own
-- status). Directors need to see pending rows too, for the approval screen —
-- current_user_role() only resolves 'director' for an already-active caller,
-- so this can't be used by a pending user to see everyone else early.
drop policy if exists "profiles_select_all" on public.profiles;

create policy "profiles_select" on public.profiles
  for select using (
    id = auth.uid()
    or status = 'active'
    or public.current_user_role() = 'director'
  );

-- The /team approval screen and the /pending waiting screen both subscribe.
do $$
begin
  begin
    alter publication supabase_realtime add table public.profiles;
  exception when duplicate_object then null;
  end;
end;
$$;
