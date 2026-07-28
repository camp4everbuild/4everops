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

/** Replaces a day's stops in one shot from a parsed CSV — simpler than merging row-by-row against whatever's already there. */
export async function importScheduleStops(
  travelDate: string,
  rows: { label: string; address: string; time: string | null; notes: string | null }[],
): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!isOversight(profile)) return { error: "Only a director or head can edit the schedule." };

  const cleanRows = rows
    .map((r) => ({
      label: r.label.trim(),
      address: r.address.trim(),
      time: r.time?.trim() || null,
      notes: r.notes?.trim() || null,
    }))
    .filter((r) => r.label.length > 0 && r.address.length > 0);
  if (cleanRows.length === 0) {
    return { error: "No rows with both a label and an address found in that file." };
  }

  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from("schedule_stops")
    .delete()
    .eq("travel_date", travelDate);
  if (deleteError) return { error: deleteError.message };

  const { error: insertError } = await supabase.from("schedule_stops").insert(
    cleanRows.map((r, i) => ({
      travel_date: travelDate,
      label: r.label,
      address: r.address,
      time: r.time,
      notes: r.notes,
      sort_order: i,
      created_by: profile.id,
    })),
  );
  if (insertError) return { error: insertError.message };

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
