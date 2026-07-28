"use server";

import { revalidatePath } from "next/cache";
import { requireProfile, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mutationResult, type ActionResult } from "./types";

export async function createAnnouncement(input: {
  title: string;
  body: string;
  requiresAck: boolean;
}): Promise<ActionResult> {
  const profile = await requireRole("director");

  const title = input.title.trim();
  const body = input.body.trim();
  if (!title || !body) return { error: "Title and body are required." };

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({
    title,
    body,
    requires_ack: input.requiresAck,
    created_by: profile.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/announcements");
  return { error: null };
}

export async function acknowledgeAnnouncement(announcementId: string): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("announcement_acknowledgments").insert({
    announcement_id: announcementId,
    user_id: profile.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/announcements");
  return { error: null };
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  await requireRole("director");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", id)
    .select("id");

  const result = mutationResult(data, error);
  if (!result.error) revalidatePath("/announcements");
  return result;
}
