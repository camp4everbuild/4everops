"use server";

import { revalidatePath } from "next/cache";
import { isOversight, requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { TaskPriority } from "@/lib/types";
import { mutationResult, type ActionResult } from "./types";

/** Anyone active can log a task for themselves or a colleague — not director-only. */
export async function createTask(input: {
  title: string;
  description: string | null;
  assignedTo: string;
  dueAt: string | null;
  priority: TaskPriority;
}): Promise<ActionResult> {
  const profile = await requireProfile();

  const title = input.title.trim();
  if (!title) return { error: "Title is required." };
  if (!input.assignedTo) return { error: "Pick who this task is for." };

  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({
    title,
    description: input.description?.trim() || null,
    assigned_to: input.assignedTo,
    assigned_by: profile.id,
    due_at: input.dueAt,
    priority: input.priority,
  });

  if (error) return { error: error.message };

  revalidatePath("/");
  return { error: null };
}

export async function updateTaskStatus(
  id: string,
  status: "pending" | "in_progress" | "completed",
): Promise<ActionResult> {
  await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", id)
    .select("id");

  const result = mutationResult(data, error);
  if (!result.error) revalidatePath("/");
  return result;
}

export async function updateTaskNotes(id: string, notes: string): Promise<ActionResult> {
  await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .update({ notes: notes.trim() || null })
    .eq("id", id)
    .select("id");

  const result = mutationResult(data, error);
  if (!result.error) revalidatePath("/");
  return result;
}

/** Director/head hands a task to someone else — the original assignee loses it, the new one gets notified. */
export async function reassignTask(id: string, assigneeId: string): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!isOversight(profile)) return { error: "Only a director or head can reassign tasks." };
  if (!assigneeId) return { error: "Pick who this task is for." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .update({ assigned_to: assigneeId })
    .eq("id", id)
    .select("id");

  const result = mutationResult(data, error);
  if (!result.error) revalidatePath("/");
  return result;
}

export async function deleteTask(id: string): Promise<ActionResult> {
  await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").delete().eq("id", id).select("id");

  const result = mutationResult(data, error);
  if (!result.error) revalidatePath("/");
  return result;
}
