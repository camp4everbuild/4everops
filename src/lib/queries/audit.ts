import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { AuditLogEntry } from "@/lib/types";

export async function getAuditLog(): Promise<AuditLogEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return (data ?? []) as AuditLogEntry[];
}
