import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { OpenJobWithPeople } from "@/lib/types";

const SELECT_WITH_PEOPLE =
  "*, creator:created_by(id, full_name), claimer:claimed_by(id, full_name)";

export async function getOpenJobs(): Promise<OpenJobWithPeople[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("open_jobs")
    .select(SELECT_WITH_PEOPLE)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as OpenJobWithPeople[];
}
