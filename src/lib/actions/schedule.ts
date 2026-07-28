"use server";

import { revalidatePath } from "next/cache";
import { isOversight, requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mutationResult, type ActionResult } from "./types";

export async function addScheduleStop(input: {
  travelDate: string;
  label: string;
  address: string;
  time: string | null;
  notes: string | null;
  sortOrder: number;
}): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!isOversight(profile)) return { error: "Only a director or head can edit the schedule." };

  const label = input.label.trim();
  const address = input.address.trim();
  if (!label || !address) return { error: "Label and address are required." };

  const supabase = await createClient();
  const { error } = await supabase.from("schedule_stops").insert({
    travel_date: input.travelDate,
    label,
    address,
    time: input.time,
    notes: input.notes?.trim() || null,
    sort_order: input.sortOrder,
    created_by: profile.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/today");
  return { error: null };
}

export async function deleteScheduleStop(id: string): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!isOversight(profile)) return { error: "Only a director or head can edit the schedule." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("schedule_stops").delete().eq("id", id).select("id");

  const result = mutationResult(data, error);
  if (!result.error) revalidatePath("/today");
  return result;
}
