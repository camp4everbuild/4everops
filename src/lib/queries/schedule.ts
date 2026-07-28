import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ScheduleStop } from "@/lib/types";

export async function getScheduleStops(travelDate: string): Promise<ScheduleStop[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schedule_stops")
    .select("*")
    .eq("travel_date", travelDate)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data ?? []) as ScheduleStop[];
}
