import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  Checklist,
  ChecklistItemWithAssignee,
  ChecklistTemplate,
  ChecklistTemplateItem,
} from "@/lib/types";

export async function getChecklists(): Promise<Checklist[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checklists")
    .select("*")
    .order("checklist_date", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Checklist[];
}

export async function getChecklist(id: string): Promise<Checklist | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checklists")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as Checklist | null;
}

export async function getChecklistItems(
  checklistId: string,
): Promise<ChecklistItemWithAssignee[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checklist_items")
    .select("*, assignee:assigned_to(id, full_name)")
    .eq("checklist_id", checklistId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as ChecklistItemWithAssignee[];
}

/** Today's checklist, or null if nobody's started it yet. RLS already scopes item visibility by department. */
export async function getTodayChecklist(): Promise<Checklist | null> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("checklists")
    .select("*")
    .eq("checklist_date", today)
    .maybeSingle();

  if (error) throw error;
  return data as Checklist | null;
}

export async function getTemplates(): Promise<ChecklistTemplate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checklist_templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ChecklistTemplate[];
}

export async function getTemplateItems(templateId: string): Promise<ChecklistTemplateItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("checklist_template_items")
    .select("*")
    .eq("template_id", templateId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ChecklistTemplateItem[];
}
