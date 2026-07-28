"use server";

import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "./types";

export async function saveSubscription(subscription: {
  endpoint: string;
  p256dh: string;
  authKey: string;
}): Promise<ActionResult> {
  const profile = await requireProfile();

  const supabase = await createClient();
  // Delete-then-insert rather than upsert — re-subscribing to the same
  // endpoint (permission revoked and regranted) is rare enough that this
  // is simpler than needing an UPDATE policy just for that edge case.
  await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);

  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: profile.id,
    endpoint: subscription.endpoint,
    p256dh: subscription.p256dh,
    auth_key: subscription.authKey,
  });

  if (error) return { error: error.message };
  return { error: null };
}

export async function removeSubscription(endpoint: string): Promise<ActionResult> {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);

  if (error) return { error: error.message };
  return { error: null };
}
