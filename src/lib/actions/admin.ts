"use server";

import { revalidatePath } from "next/cache";
import { isAdmin, requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import type { Profile, UserRole } from "@/lib/types";
import { mutationResult, type ActionResult } from "./types";

/**
 * Guards granting/revoking the admin role specifically — a director alone
 * can't hand out full system control. Mirrors the enforce_profile_role_change
 * DB trigger, but that trigger only fires on RLS-bound writes; the actions
 * below write through the service-role admin client (to get past profiles
 * RLS for editing someone else), which bypasses triggers entirely — so this
 * is the actual enforcement for those paths, not just defense in depth.
 * Same bootstrap exception as the trigger: if nobody holds admin yet, a
 * director can grant the first one.
 */
async function assertCanGrantAdmin(
  actor: Profile,
  previousRoles: UserRole[],
  nextRoles: UserRole[],
): Promise<string | null> {
  const adminChanged = nextRoles.includes("admin") !== previousRoles.includes("admin");
  if (!adminChanged || isAdmin(actor)) return null;

  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("id").contains("roles", ["admin"]).limit(1);
  if (data && data.length > 0) {
    return "Only an admin can grant or revoke the admin role.";
  }
  return null;
}

/**
 * Invites a new staff member by email and sets their role. Only a director
 * or admin can call this — everyone after the first account is invite-only,
 * per the signup-role-spoofing fix in the security migration.
 *
 * handle_new_user() runs at invite time and defaults new profiles to
 * 'support_staff', so we patch the row afterward with the service-role
 * client (which the enforce_profile_role_change trigger trusts).
 */
export async function inviteUser(input: {
  email: string;
  fullName: string;
  roles: UserRole[];
}): Promise<ActionResult> {
  const profile = await requireRole("director", "admin");

  const email = input.email.trim();
  const fullName = input.fullName.trim();
  if (!email || !fullName) return { error: "Email and name are required." };
  if (input.roles.length === 0) return { error: "Pick at least one role." };

  const guardError = await assertCanGrantAdmin(profile, [], input.roles);
  if (guardError) return { error: guardError };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
  });

  if (error) return { error: error.message };

  // A director-initiated invite is itself the approval — no need to wait
  // in the pending queue like a self-serve OAuth signup would.
  const { error: profileError } = await admin
    .from("profiles")
    .update({ full_name: fullName, roles: input.roles, status: "active" })
    .eq("id", data.user.id);

  if (profileError) return { error: profileError.message };

  await logAudit({
    actorId: profile.id,
    actorName: profile.full_name,
    action: "invite_user",
    targetTable: "profiles",
    targetId: data.user.id,
    detail: `Invited ${fullName} (${email}) as ${input.roles.join(", ")}`,
  });

  revalidatePath("/team");
  return { error: null };
}

export async function updateUserRoles(userId: string, roles: UserRole[]): Promise<ActionResult> {
  const profile = await requireRole("director", "admin");
  if (roles.length === 0) return { error: "Pick at least one role." };

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("roles, full_name")
    .eq("id", userId)
    .maybeSingle();
  if (!target) return { error: "User not found." };

  const guardError = await assertCanGrantAdmin(profile, target.roles, roles);
  if (guardError) return { error: guardError };

  const { data, error } = await admin
    .from("profiles")
    .update({ roles })
    .eq("id", userId)
    .select("id, full_name");

  const result = mutationResult(data, error);
  if (!result.error) {
    await logAudit({
      actorId: profile.id,
      actorName: profile.full_name,
      action: "update_user_roles",
      targetTable: "profiles",
      targetId: userId,
      detail: `Set roles for ${data?.[0]?.full_name ?? target.full_name} to ${roles.join(", ")}`,
    });
    revalidatePath("/team");
  }
  return result;
}

/**
 * Approves a pending self-serve signup (Google/Apple OAuth) and assigns
 * their roles in one step. Uses the caller's own session rather than the
 * admin client — a director/admin updating someone else's row already
 * satisfies both the RLS policy and the enforce_profile_role_change trigger.
 */
export async function approveUser(userId: string, roles: UserRole[]): Promise<ActionResult> {
  const profile = await requireRole("director", "admin");
  if (roles.length === 0) return { error: "Pick at least one role." };

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("roles, full_name")
    .eq("id", userId)
    .maybeSingle();
  if (!target) return { error: "User not found." };

  const guardError = await assertCanGrantAdmin(profile, target.roles, roles);
  if (guardError) return { error: guardError };

  const { data, error } = await supabase
    .from("profiles")
    .update({ roles, status: "active" })
    .eq("id", userId)
    .select("id, full_name");

  const result = mutationResult(data, error);
  if (!result.error) {
    await logAudit({
      actorId: profile.id,
      actorName: profile.full_name,
      action: "approve_user",
      targetTable: "profiles",
      targetId: userId,
      detail: `Approved ${data?.[0]?.full_name ?? target.full_name} with roles ${roles.join(", ")}`,
    });
    revalidatePath("/team");
  }
  return result;
}
