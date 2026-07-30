"use server";

import { revalidatePath } from "next/cache";
import { requireProfile, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { mutationResult, type ActionResult } from "./types";

export async function markNotificationRead(id: string): Promise<ActionResult> {
  await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .select("id");

  const result = mutationResult(data, error);
  if (!result.error) revalidatePath("/", "layout");
  return result;
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", profile.id)
    .eq("is_read", false);

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { error: null };
}

export async function deleteNotification(id: string): Promise<ActionResult> {
  await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", id)
    .select("id");

  const result = mutationResult(data, error);
  if (!result.error) revalidatePath("/", "layout");
  return result;
}

/** Director resends a notification (and its push) — a fresh row so the existing INSERT-based push trigger fires again. */
export async function retriggerNotification(id: string): Promise<ActionResult> {
  const profile = await requireRole("director");

  const supabase = await createClient();
  const { data: original, error: fetchError } = await supabase
    .from("notifications")
    .select("user_id, type, title, body, related_table, related_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!original) return { error: "Notification not found." };

  const { error } = await supabase.from("notifications").insert(original);
  if (error) return { error: error.message };

  await logAudit({
    actorId: profile.id,
    actorName: profile.full_name,
    action: "resend_notification",
    targetTable: "notifications",
    targetId: id,
    detail: original.title,
  });

  revalidatePath("/admin");
  return { error: null };
}
