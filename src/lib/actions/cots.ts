"use server";

import { revalidatePath } from "next/cache";
import { isOversight, requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
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

  await logAudit({
    actorId: profile.id,
    actorName: profile.full_name,
    action: "register_cot",
    targetTable: "cots",
    detail: `Cot #${number}`,
  });

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
    .select("id, number");

  const result = mutationResult(data, error);
  if (!result.error) {
    await logAudit({
      actorId: profile.id,
      actorName: profile.full_name,
      action: "check_cot_out",
      targetTable: "cots",
      targetId: id,
      detail: data?.[0] ? `Cot #${data[0].number} → ${room}` : room,
    });
    revalidatePath("/today");
  }
  return result;
}

export async function checkCotReturned(id: string): Promise<ActionResult> {
  const profile = await requireProfile();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cots")
    .update({ is_out: false, returned_at: new Date().toISOString(), returned_by: profile.id })
    .eq("id", id)
    .select("id, number");

  const result = mutationResult(data, error);
  if (!result.error) {
    await logAudit({
      actorId: profile.id,
      actorName: profile.full_name,
      action: "check_cot_returned",
      targetTable: "cots",
      targetId: id,
      detail: data?.[0] ? `Cot #${data[0].number}` : undefined,
    });
    revalidatePath("/today");
  }
  return result;
}

export async function deleteCot(id: string): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!isOversight(profile)) return { error: "Only a director or head can remove a cot." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("cots").delete().eq("id", id).select("id, number");

  const result = mutationResult(data, error);
  if (!result.error) {
    await logAudit({
      actorId: profile.id,
      actorName: profile.full_name,
      action: "delete_cot",
      targetTable: "cots",
      targetId: id,
      detail: data?.[0] ? `Cot #${data[0].number}` : undefined,
    });
    revalidatePath("/today");
  }
  return result;
}
