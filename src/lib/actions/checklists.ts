"use server";

import { revalidatePath } from "next/cache";
import { isOversight, requireProfile, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Department } from "@/lib/types";
import { mutationResult, type ActionResult } from "./types";

export async function createChecklist(input: {
  name: string;
  checklistDate: string;
}): Promise<ActionResult> {
  const profile = await requireRole("director");

  const name = input.name.trim();
  if (!name) return { error: "Name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("checklists").insert({
    name,
    checklist_date: input.checklistDate,
    created_by: profile.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/checklists");
  return { error: null };
}

export async function deleteChecklist(id: string): Promise<ActionResult> {
  await requireRole("director");
  const supabase = await createClient();
  const { data, error } = await supabase.from("checklists").delete().eq("id", id).select("id");

  const result = mutationResult(data, error);
  if (!result.error) revalidatePath("/checklists");
  return result;
}

export async function addChecklistItem(input: {
  checklistId: string;
  title: string;
  department: Department;
  assignedTo: string | null;
  sortOrder: number;
}): Promise<ActionResult> {
  await requireRole("director");

  const title = input.title.trim();
  if (!title) return { error: "Title is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("checklist_items").insert({
    checklist_id: input.checklistId,
    title,
    department: input.department,
    assigned_to: input.assignedTo,
    sort_order: input.sortOrder,
  });

  if (error) return { error: error.message };

  revalidatePath("/today");
  return { error: null };
}

export async function toggleChecklistItem(
  id: string,
  isComplete: boolean,
): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checklist_items")
    .update({
      is_complete: isComplete,
      completed_by: isComplete ? profile.id : null,
      completed_at: isComplete ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select("id");

  const result = mutationResult(data, error);
  if (!result.error) revalidatePath("/today");
  return result;
}

export async function assignChecklistItem(id: string, userId: string | null): Promise<ActionResult> {
  await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checklist_items")
    .update({ assigned_to: userId })
    .eq("id", id)
    .select("id");

  const result = mutationResult(data, error);
  if (!result.error) revalidatePath("/today");
  return result;
}

export async function deleteChecklistItem(id: string): Promise<ActionResult> {
  await requireRole("director");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checklist_items")
    .delete()
    .eq("id", id)
    .select("id");

  const result = mutationResult(data, error);
  if (!result.error) revalidatePath("/today");
  return result;
}

/** Creates a reusable daily template in one shot: the template row plus every item. */
export async function createTemplate(input: {
  name: string;
  items: { title: string; department: Department }[];
}): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!isOversight(profile)) return { error: "Only a director or head can manage templates." };

  const name = input.name.trim();
  if (!name) return { error: "Name is required." };
  const items = input.items.map((i) => ({ ...i, title: i.title.trim() })).filter((i) => i.title);
  if (items.length === 0) return { error: "Add at least one item." };

  const supabase = await createClient();
  const { data: template, error: templateError } = await supabase
    .from("checklist_templates")
    .insert({ name, created_by: profile.id })
    .select("id")
    .single();

  if (templateError) return { error: templateError.message };

  const { error: itemsError } = await supabase.from("checklist_template_items").insert(
    items.map((item, index) => ({
      template_id: template.id,
      title: item.title,
      department: item.department,
      sort_order: index,
    })),
  );

  if (itemsError) return { error: itemsError.message };

  revalidatePath("/today");
  return { error: null };
}

/** Clones a template into today's real checklist, or returns the existing one if already started. */
export async function startTodayChecklist(templateId: string): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!isOversight(profile)) return { error: "Only a director or head can start today's checklist." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("start_today_checklist", { p_template_id: templateId });

  if (error) return { error: error.message };

  revalidatePath("/today");
  return { error: null };
}
