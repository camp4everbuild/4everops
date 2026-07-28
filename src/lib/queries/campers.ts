import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Camper, CamperNote } from "@/lib/types";

export async function getCampers(): Promise<Camper[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campers")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Camper[];
}

export async function getCamper(id: string): Promise<Camper | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data as Camper | null;
}

/** Returns null if the caller has no RLS access to this camper's notes (not their counselor, not a director). */
export async function getCamperNote(camperId: string): Promise<CamperNote | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("camper_notes")
    .select("*")
    .eq("camper_id", camperId)
    .maybeSingle();

  if (error) throw error;
  return data as CamperNote | null;
}
