"use server";

import { revalidatePath } from "next/cache";
import { isOversight, requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { mutationResult, type ActionResult } from "./types";

/** Stages a batch of CSV rows for review — nothing becomes a real task or job until a director/head dispositions each one. */
export async function importPendingRows(
  batchLabel: string,
  rows: { title: string; description: string | null }[],
): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!isOversight(profile)) return { error: "Only a director or head can import." };

  const label = batchLabel.trim();
  if (!label) return { error: "Give this batch a label." };

  const cleanRows = rows
    .map((r) => ({ title: r.title.trim(), description: r.description?.trim() || null }))
    .filter((r) => r.title.length > 0);
  if (cleanRows.length === 0) return { error: "No rows with a title found in that file." };

  const supabase = await createClient();
  const { error } = await supabase.from("pending_imports").insert(
    cleanRows.map((r) => ({
      title: r.title,
      description: r.description,
      batch_label: label,
      created_by: profile.id,
    })),
  );

  if (error) return { error: error.message };

  revalidatePath("/imports");
  return { error: null };
}

async function loadPendingImport(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pending_imports")
    .select("id, title, description")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function pushPendingToOpenJob(id: string): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!isOversight(profile)) return { error: "Only a director or head can post jobs." };

  const pending = await loadPendingImport(id);
  if (!pending) return { error: "Not found, or you don't have permission to do that." };

  const supabase = await createClient();
  const { error: insertError } = await supabase.from("open_jobs").insert({
    title: pending.title,
    description: pending.description,
    created_by: profile.id,
  });
  if (insertError) return { error: insertError.message };

  const { data, error } = await supabase.from("pending_imports").delete().eq("id", id).select("id");
  const result = mutationResult(data, error);
  if (!result.error) revalidatePath("/imports");
  return result;
}

export async function assignPendingAsTask(id: string, assigneeId: string): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!isOversight(profile)) return { error: "Only a director or head can assign tasks." };
  if (!assigneeId) return { error: "Pick who this is for." };

  const pending = await loadPendingImport(id);
  if (!pending) return { error: "Not found, or you don't have permission to do that." };

  const supabase = await createClient();
  const { error: insertError } = await supabase.from("tasks").insert({
    title: pending.title,
    description: pending.description,
    assigned_to: assigneeId,
    assigned_by: profile.id,
    priority: "medium",
  });
  if (insertError) return { error: insertError.message };

  const { data, error } = await supabase.from("pending_imports").delete().eq("id", id).select("id");
  const result = mutationResult(data, error);
  if (!result.error) revalidatePath("/imports");
  return result;
}

export async function deletePendingImport(id: string): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!isOversight(profile)) return { error: "Only a director or head can do that." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("pending_imports").delete().eq("id", id).select("id");

  const result = mutationResult(data, error);
  if (!result.error) revalidatePath("/imports");
  return result;
}
