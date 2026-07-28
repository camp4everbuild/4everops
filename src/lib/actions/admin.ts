"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";
import { mutationResult, type ActionResult } from "./types";

/**
 * Invites a new staff member by email and sets their role. Only a director
 * can call this — everyone after the first account is invite-only, per the
 * signup-role-spoofing fix in the security migration.
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
  await requireRole("director");

  const email = input.email.trim();
  const fullName = input.fullName.trim();
  if (!email || !fullName) return { error: "Email and name are required." };
  if (input.roles.length === 0) return { error: "Pick at least one role." };

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

  revalidatePath("/team");
  return { error: null };
}

export async function updateUserRoles(userId: string, roles: UserRole[]): Promise<ActionResult> {
  await requireRole("director");
  if (roles.length === 0) return { error: "Pick at least one role." };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({ roles })
    .eq("id", userId)
    .select("id");

  const result = mutationResult(data, error);
  if (!result.error) revalidatePath("/team");
  return result;
}

/**
 * Approves a pending self-serve signup (Google/Apple OAuth) and assigns
 * their roles in one step. Uses the caller's own session rather than the
 * admin client — a director updating someone else's row already satisfies
 * both the RLS policy and the enforce_profile_role_change trigger.
 */
export async function approveUser(userId: string, roles: UserRole[]): Promise<ActionResult> {
  await requireRole("director");
  if (roles.length === 0) return { error: "Pick at least one role." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ roles, status: "active" })
    .eq("id", userId)
    .select("id");

  const result = mutationResult(data, error);
  if (!result.error) revalidatePath("/team");
  return result;
}
