import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Records an admin-relevant action for the /admin audit log — deletions,
 * role/approval changes, notification resends. Deliberately not called for
 * routine operational activity (claiming a job, checking off a checklist
 * item) — that's already visible via each board's own History tab, and
 * logging every status flip would bury the events actually worth auditing.
 * Best-effort: a logging failure shouldn't fail the action it's attached to.
 */
export async function logAudit(input: {
  actorId: string;
  actorName: string;
  action: string;
  targetTable?: string;
  targetId?: string;
  detail?: string;
}): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from("audit_log").insert({
      actor_id: input.actorId,
      actor_name: input.actorName,
      action: input.action,
      target_table: input.targetTable ?? null,
      target_id: input.targetId ?? null,
      detail: input.detail ?? null,
    });
  } catch {
    // Best-effort — see doc comment above.
  }
}
