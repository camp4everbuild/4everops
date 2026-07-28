import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ScheduleStopWithAssignee } from "@/lib/types";

const SELECT_WITH_ASSIGNEE = "*, assignee:assigned_to(id, full_name, phone)";

export async function getScheduleStops(travelDate: string): Promise<ScheduleStopWithAssignee[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schedule_stops")
    .select(SELECT_WITH_ASSIGNEE)
    .eq("travel_date", travelDate)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as ScheduleStopWithAssignee[];
}
