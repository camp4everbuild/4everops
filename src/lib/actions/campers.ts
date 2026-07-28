"use server";

import { revalidatePath } from "next/cache";
import { requireProfile, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mutationResult, type ActionResult } from "./types";

export type CamperInput = {
  fullName: string;
  counselorId: string | null;
  parentName: string | null;
  parentPhone: string | null;
  tshirtSize: string | null;
  cabinGroup: string | null;
};

export async function createCamper(input: CamperInput): Promise<ActionResult> {
  await requireRole("director");

  const fullName = input.fullName.trim();
  if (!fullName) return { error: "Name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("campers").insert({
    full_name: fullName,
    counselor_id: input.counselorId,
    parent_name: input.parentName?.trim() || null,
    parent_phone: input.parentPhone?.trim() || null,
    tshirt_size: input.tshirtSize,
    cabin_group: input.cabinGroup?.trim() || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/campers");
  return { error: null };
}

export async function updateCamper(id: string, input: CamperInput): Promise<ActionResult> {
  await requireRole("director");

  const fullName = input.fullName.trim();
  if (!fullName) return { error: "Name is required." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campers")
    .update({
      full_name: fullName,
      counselor_id: input.counselorId,
      parent_name: input.parentName?.trim() || null,
      parent_phone: input.parentPhone?.trim() || null,
      tshirt_size: input.tshirtSize,
      cabin_group: input.cabinGroup?.trim() || null,
    })
    .eq("id", id)
    .select("id");

  const result = mutationResult(data, error);
  if (!result.error) revalidatePath("/campers");
  return result;
}

export async function deleteCamper(id: string): Promise<ActionResult> {
  await requireRole("director");
  const supabase = await createClient();
  const { data, error } = await supabase.from("campers").delete().eq("id", id).select("id");

  const result = mutationResult(data, error);
  if (!result.error) revalidatePath("/campers");
  return result;
}

/** Director, or the camper's assigned counselor per camper_notes RLS. */
export async function updateCamperNote(camperId: string, notes: string): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("camper_notes")
    .upsert({
      camper_id: camperId,
      notes: notes.trim() || null,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    })
    .select("camper_id");

  const result = mutationResult(data, error);
  if (!result.error) revalidatePath("/campers");
  return result;
}
