"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mutationResult, type ActionResult } from "./types";

export async function logCot(roomOrGroup: string, notes: string | null): Promise<ActionResult> {
  const profile = await requireProfile();

  const room = roomOrGroup.trim();
  if (!room) return { error: "Room or group is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("cot_loans").insert({
    room_or_group: room,
    given_by: profile.id,
    notes: notes?.trim() || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/today");
  return { error: null };
}

export async function markCotReturned(id: string): Promise<ActionResult> {
  const profile = await requireProfile();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cot_loans")
    .update({ returned_at: new Date().toISOString(), returned_by: profile.id })
    .eq("id", id)
    .select("id");

  const result = mutationResult(data, error);
  if (!result.error) revalidatePath("/today");
  return result;
}
