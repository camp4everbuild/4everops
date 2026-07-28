import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { PendingImport } from "@/lib/types";

export async function getPendingImports(): Promise<PendingImport[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pending_imports")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PendingImport[];
}
