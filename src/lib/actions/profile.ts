"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./types";

/** Self-service fields only. Role changes go through admin.ts and require a director. */
export async function updateOwnProfile(input: {
  fullName: string;
  phone: string | null;
  tshirtSize: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
}): Promise<ActionResult> {
  const profile = await requireProfile();

  const fullName = input.fullName.trim();
  if (!fullName) return { error: "Name is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone: input.phone?.trim() || null,
      tshirt_size: input.tshirtSize,
      emergency_contact_name: input.emergencyContactName?.trim() || null,
      emergency_contact_phone: input.emergencyContactPhone?.trim() || null,
    })
    .eq("id", profile.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { error: null };
}
