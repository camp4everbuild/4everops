-- ============================================================================
-- 4everOPS — Admin role: helpers + locked-down grant/revoke
-- ============================================================================
-- Run after 20260730010000_admin_role.sql (separate transaction — see that
-- file for why).
--
-- is_director() is broadened to also cover 'admin' — every existing
-- "director-only" RLS policy and app-side requireRole("director") call
-- that goes through it therefore treats admin as equivalent full control,
-- with nothing else needing to change. is_admin() is the narrow check,
-- used only to decide who may grant/revoke the admin role itself.
--
-- IMPORTANT: this DB trigger is NOT the only enforcement for grant/revoke.
-- inviteUser/updateUserRoles (src/lib/actions/admin.ts) write through the
-- service-role admin client, which bypasses RLS and this trigger entirely
-- — the real guard for those lives in the app layer. This trigger is what
-- protects approveUser (which does use the caller's own RLS-bound client)
-- and any other direct write path.
-- ============================================================================

create or replace function public.is_director()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select roles && array['director', 'admin']::user_role[] from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select 'admin' = any(roles) from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_oversight()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (
      select roles && array['director', 'admin', 'head_counselor', 'head_support', 'head_kitchen']::user_role[]
      from public.profiles
      where id = auth.uid()
    ),
    false
  );
$$;

create or replace function public.enforce_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_changed boolean;
  v_admin_exists boolean;
begin
  if current_user = 'service_role' or auth.uid() is null then
    return new;
  end if;

  if new.roles is distinct from old.roles then
    if not public.is_director() then
      raise exception 'Only a director or admin can change a user role';
    end if;

    v_admin_changed := ('admin' = any(new.roles)) is distinct from ('admin' = any(old.roles));
    if v_admin_changed and not public.is_admin() then
      select exists(select 1 from public.profiles where 'admin' = any(roles)) into v_admin_exists;
      -- Bootstrap exception: if literally nobody holds admin yet, a
      -- director can grant the first one. Locks down the moment that's
      -- no longer true.
      if v_admin_exists then
        raise exception 'Only an admin can grant or revoke the admin role';
      end if;
    end if;
  end if;

  return new;
end;
$$;
