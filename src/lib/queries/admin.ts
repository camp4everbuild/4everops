import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export type AdminStats = {
  activeStaff: number;
  pendingApprovals: number;
  openJobs: number;
  activeTasks: number;
  cotsOut: number;
  checklistDone: number;
  checklistTotal: number;
};

export async function getAdminStats(): Promise<AdminStats> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [
    { count: activeStaff },
    { count: pendingApprovals },
    { count: openJobs },
    { count: activeTasks },
    { count: cotsOut },
    { data: checklist },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("open_jobs").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("tasks").select("id", { count: "exact", head: true }).neq("status", "completed"),
    supabase.from("cots").select("id", { count: "exact", head: true }).eq("is_out", true),
    supabase.from("checklists").select("id").eq("checklist_date", today).maybeSingle(),
  ]);

  let checklistDone = 0;
  let checklistTotal = 0;
  if (checklist) {
    const [{ count: total }, { count: done }] = await Promise.all([
      supabase.from("checklist_items").select("id", { count: "exact", head: true }).eq("checklist_id", checklist.id),
      supabase
        .from("checklist_items")
        .select("id", { count: "exact", head: true })
        .eq("checklist_id", checklist.id)
        .eq("is_complete", true),
    ]);
    checklistTotal = total ?? 0;
    checklistDone = done ?? 0;
  }

  return {
    activeStaff: activeStaff ?? 0,
    pendingApprovals: pendingApprovals ?? 0,
    openJobs: openJobs ?? 0,
    activeTasks: activeTasks ?? 0,
    cotsOut: cotsOut ?? 0,
    checklistDone,
    checklistTotal,
  };
}

export type WorkerWithLastLogin = Profile & { last_login: string | null };

/** Every profile (any status), plus each person's most recent login pulled from the audit log. */
export async function getWorkersWithLastLogin(): Promise<WorkerWithLastLogin[]> {
  const supabase = await createClient();

  const [{ data: profiles, error }, { data: logins }] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name", { ascending: true }),
    supabase
      .from("audit_log")
      .select("actor_id, created_at")
      .eq("action", "login")
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  if (error) throw error;

  const lastLoginByActor = new Map<string, string>();
  for (const row of logins ?? []) {
    if (row.actor_id && !lastLoginByActor.has(row.actor_id)) {
      lastLoginByActor.set(row.actor_id, row.created_at);
    }
  }

  return (profiles ?? []).map((p) => ({
    ...p,
    last_login: lastLoginByActor.get(p.id) ?? null,
  })) as WorkerWithLastLogin[];
}
