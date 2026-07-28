import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { TaskWithPeople } from "@/lib/types";

const SELECT_WITH_PEOPLE =
  "*, assignee:assigned_to(id, full_name, phone), assigner:assigned_by(id, full_name, phone)";

/** Tasks assigned to you, plus ones you created for someone else — your whole stake in the board. */
export async function getMyTasks(userId: string): Promise<TaskWithPeople[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(SELECT_WITH_PEOPLE)
    .or(`assigned_to.eq.${userId},assigned_by.eq.${userId}`)
    .order("due_at", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as unknown as TaskWithPeople[];
}

export async function getAllTasks(): Promise<TaskWithPeople[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(SELECT_WITH_PEOPLE)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as TaskWithPeople[];
}

/**
 * How many open (non-completed) tasks each person currently has — used as a
 * lightweight "who's free" signal on assignment pickers. Deliberately just a
 * count, not a real workload model: small team, good enough to nudge toward
 * the least-busy person rather than pretending to be smarter than it is.
 */
export async function getOpenTaskCounts(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("assigned_to")
    .neq("status", "completed");

  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.assigned_to] = (counts[row.assigned_to] ?? 0) + 1;
  }
  return counts;
}
