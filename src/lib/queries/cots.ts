import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { CotLoan } from "@/lib/types";

/** Cots still out — nothing marked returned yet. */
export async function getOutstandingCots(): Promise<CotLoan[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cot_loans")
    .select("*")
    .is("returned_at", null)
    .order("given_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as CotLoan[];
}
