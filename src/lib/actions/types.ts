export type ActionResult = { error: string | null };

/**
 * Supabase's default `return=minimal` means an update/delete that RLS
 * silently filters down to 0 rows still comes back as `{ error: null }`.
 * Callers must add `.select("id")` (or similar) so `data` reflects what was
 * actually touched, then run the result through this to turn a silent no-op
 * into a real error instead of a false "success".
 */
export function mutationResult(
  data: unknown[] | null,
  error: { message: string } | null,
): ActionResult {
  if (error) return { error: error.message };
  if (!data || data.length === 0) {
    return { error: "Not found, or you don't have permission to do that." };
  }
  return { error: null };
}
