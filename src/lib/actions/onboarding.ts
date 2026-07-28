"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { capitalizeWords, digitsOnly, formatPhone } from "@/lib/format";
import { mutationResult, type ActionResult } from "./types";

/**
 * Captures name + phone for a freshly signed-in OAuth user. Runs before the
 * pending/active check, so it only requires a session — not an approved
 * profile. Redirects to /pending on success, matching the login action's
 * "redirect on success, return an error object on failure" convention.
 */
export async function completeOnboarding(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const firstName = capitalizeWords(String(formData.get("firstName") ?? "").trim());
  const lastName = capitalizeWords(String(formData.get("lastName") ?? "").trim());
  const phoneDigits = digitsOnly(String(formData.get("phone") ?? ""));

  if (!firstName || !lastName) {
    return { error: "Enter your first and last name." };
  }
  if (phoneDigits.length !== 10) {
    return { error: "Phone number must be 10 digits." };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: `${firstName} ${lastName}`,
      phone: formatPhone(phoneDigits),
    })
    .eq("id", user.id)
    .select("id");

  const result = mutationResult(data, error);
  if (result.error) return result;

  redirect("/pending");
}
