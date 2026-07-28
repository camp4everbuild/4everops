import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Cot } from "@/lib/types";

/** The whole numbered roster, not just what's currently out — staff need to see what's available too. */
export async function getAllCots(): Promise<Cot[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("cots").select("*").order("number", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Cot[];
}
