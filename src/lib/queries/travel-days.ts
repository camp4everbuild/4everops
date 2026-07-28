import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { TravelDay } from "@/lib/types";

export async function getTravelDays(): Promise<TravelDay[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("travel_days")
    .select("*")
    .order("travel_date", { ascending: true });

  if (error) throw error;
  return (data ?? []) as TravelDay[];
}

export async function getTravelDay(id: string): Promise<TravelDay | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("travel_days")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as TravelDay | null;
}
