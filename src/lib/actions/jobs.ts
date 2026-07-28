"use server";

import { revalidatePath } from "next/cache";
import { canPostJobs, requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mutationResult, type ActionResult } from "./types";

export async function createJob(input: {
  title: string;
  description: string | null;
}): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!canPostJobs(profile)) return { error: "You can't post open jobs." };

  const title = input.title.trim();
  if (!title) return { error: "Title is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("open_jobs").insert({
    title,
    description: input.description?.trim() || null,
    created_by: profile.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/jobs");
  return { error: null };
}

export async function claimJob(id: string): Promise<ActionResult> {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_open_job", { p_job_id: id });

  if (error) return { error: error.message };

  revalidatePath("/jobs");
  return { error: null };
}

export async function startJob(id: string): Promise<ActionResult> {
  await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("open_jobs")
    .update({ status: "in_progress" })
    .eq("id", id)
    .eq("status", "claimed")
    .select("id");

  const result = mutationResult(data, error);
  if (!result.error) revalidatePath("/jobs");
  return result;
}

export async function completeJob(id: string): Promise<ActionResult> {
  await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("open_jobs")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "in_progress")
    .select("id");

  const result = mutationResult(data, error);
  if (!result.error) revalidatePath("/jobs");
  return result;
}

export async function deleteJob(id: string): Promise<ActionResult> {
  await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase.from("open_jobs").delete().eq("id", id).select("id");

  const result = mutationResult(data, error);
  if (!result.error) revalidatePath("/jobs");
  return result;
}
