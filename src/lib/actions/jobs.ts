"use server";

import { revalidatePath } from "next/cache";
import { canPostJobs, isOversight, requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
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
  const { data: created, error } = await supabase
    .from("open_jobs")
    .insert({
      title,
      description: input.description?.trim() || null,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await logAudit({
    actorId: profile.id,
    actorName: profile.full_name,
    action: "create_job",
    targetTable: "open_jobs",
    targetId: created.id,
    detail: title,
  });

  revalidatePath("/");
  return { error: null };
}

export async function claimJob(id: string): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_open_job", { p_job_id: id });

  if (error) return { error: error.message };

  await logAudit({
    actorId: profile.id,
    actorName: profile.full_name,
    action: "claim_job",
    targetTable: "open_jobs",
    targetId: id,
    detail: data?.title,
  });

  revalidatePath("/");
  return { error: null };
}

export async function startJob(id: string): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("open_jobs")
    .update({ status: "in_progress" })
    .eq("id", id)
    .eq("status", "claimed")
    .select("id, title");

  const result = mutationResult(data, error);
  if (!result.error) {
    await logAudit({
      actorId: profile.id,
      actorName: profile.full_name,
      action: "start_job",
      targetTable: "open_jobs",
      targetId: id,
      detail: data?.[0]?.title,
    });
    revalidatePath("/");
  }
  return result;
}

export async function completeJob(id: string): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("open_jobs")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "in_progress")
    .select("id, title");

  const result = mutationResult(data, error);
  if (!result.error) {
    await logAudit({
      actorId: profile.id,
      actorName: profile.full_name,
      action: "complete_job",
      targetTable: "open_jobs",
      targetId: id,
      detail: data?.[0]?.title,
    });
    revalidatePath("/");
  }
  return result;
}

/** Director/head hands a job straight to someone — skips the claim step, and can reassign an already-claimed job to someone else. */
export async function assignJob(id: string, assigneeId: string): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!isOversight(profile)) return { error: "Only a director or head can assign jobs." };
  if (!assigneeId) return { error: "Pick who this job is for." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("open_jobs")
    .update({ status: "claimed", claimed_by: assigneeId, claimed_at: new Date().toISOString() })
    .eq("id", id)
    .neq("status", "completed")
    .select("id, title");

  const result = mutationResult(data, error);
  if (!result.error) {
    await logAudit({
      actorId: profile.id,
      actorName: profile.full_name,
      action: "assign_job",
      targetTable: "open_jobs",
      targetId: id,
      detail: data?.[0]?.title,
    });
    revalidatePath("/");
  }
  return result;
}

export async function deleteJob(id: string): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase.from("open_jobs").delete().eq("id", id).select("id, title");

  const result = mutationResult(data, error);
  if (!result.error) {
    await logAudit({
      actorId: profile.id,
      actorName: profile.full_name,
      action: "delete_job",
      targetTable: "open_jobs",
      targetId: id,
      detail: data?.[0]?.title,
    });
    revalidatePath("/");
  }
  return result;
}
