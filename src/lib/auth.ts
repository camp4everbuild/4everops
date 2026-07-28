import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OVERSIGHT_ROLES, ROLE_DEPARTMENT, type Department, type Profile, type UserRole } from "@/lib/types";

/** A profile that has finished onboarding and been approved. */
export type ActiveProfile = Profile & { status: "active" };

/**
 * The signed-in user's profile. Redirects to /login if there isn't one,
 * /onboarding if they haven't given a name/phone yet, or /pending if a
 * director hasn't approved them. Every page under (app) calls this, so it
 * doubles as the auth gate.
 */
export async function requireProfile(): Promise<ActiveProfile> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // An auth user with no profile row means the signup trigger didn't fire.
  // Signing them out is clearer than rendering a half-broken shell.
  if (!profile) redirect("/auth/signout");

  const p = profile as Profile;
  if (!p.phone) redirect("/onboarding");
  if (p.status !== "active") redirect("/pending");

  return p as ActiveProfile;
}

/** Redirects to / unless the profile holds at least one of the given roles. */
export async function requireRole(...roles: UserRole[]): Promise<ActiveProfile> {
  const profile = await requireProfile();
  if (!hasAnyRole(profile, ...roles)) redirect("/");
  return profile;
}

export function hasAnyRole(profile: Profile, ...roles: UserRole[]): boolean {
  return profile.roles.some((r) => roles.includes(r));
}

export function isDirector(profile: Profile): boolean {
  return profile.roles.includes("director");
}

/** Director or any Head — sees every department, not just their own. */
export function isOversight(profile: Profile): boolean {
  return hasAnyRole(profile, ...OVERSIGHT_ROLES);
}

/** Who is allowed to post to the open jobs board. */
export function canPostJobs(profile: Profile): boolean {
  return hasAnyRole(profile, "director", "support_staff");
}

/** Distinct departments this profile belongs to, via any of their roles. */
export function departmentsFor(profile: Profile): Department[] {
  const departments = profile.roles
    .map((r) => ROLE_DEPARTMENT[r])
    .filter((d): d is Department => d != null);
  return Array.from(new Set(departments));
}
