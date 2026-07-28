"use server";

import { revalidatePath } from "next/cache";
import { isOversight, requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mutationResult, type ActionResult } from "./types";

/** Adds a new numbered cot to the physical roster — a one-time setup action, not a daily one. */
export async function registerCot(number: number): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!isOversight(profile)) return { error: "Only a director or head can add cots." };
  if (!Number.isInteger(number) || number <= 0) return { error: "Enter a valid cot number." };

  const supabase = await createClient();
  const { error } = await supabase.from("cots").insert({ number });

  if (error) {
    if (error.message.includes("duplicate key")) return { error: `Cot #${number} already exists.` };
    return { error: error.message };
  }

  revalidatePath("/today");
  return { error: null };
}

export async function checkCotOut(id: string, roomOrGroup: string): Promise<ActionResult> {
  const profile = await requireProfile();

  const room = roomOrGroup.trim();
  if (!room) return { error: "Room or group is required." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cots")
    .update({
      is_out: true,
      room_or_group: room,
      given_at: new Date().toISOString(),
      given_by: profile.id,
      returned_at: null,
      returned_by: null,
    })
    .eq("id", id)
    .select("id");

  const result = mutationResult(data, error);
  if (!result.error) revalidatePath("/today");
  return result;
}

export async function checkCotReturned(id: string): Promise<ActionResult> {
  const profile = await requireProfile();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cots")
    .update({ is_out: false, returned_at: new Date().toISOString(), returned_by: profile.id })
    .eq("id", id)
    .select("id");

  const result = mutationResult(data, error);
  if (!result.error) revalidatePath("/today");
  return result;
}

export async function deleteCot(id: string): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!isOversight(profile)) return { error: "Only a director or head can remove a cot." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("cots").delete().eq("id", id).select("id");

  const result = mutationResult(data, error);
  if (!result.error) revalidatePath("/today");
  return result;
}
