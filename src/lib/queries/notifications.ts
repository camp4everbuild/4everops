import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Notification, NotificationWithRecipient } from "@/lib/types";

export async function getNotifications(userId: string): Promise<Notification[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data ?? []) as Notification[];
}

/** Director-only view (relies on the notifications_select_director RLS policy) — everyone's recent notifications, for the admin resend tool. */
export async function getRecentNotificationsForAdmin(): Promise<NotificationWithRecipient[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*, recipient:user_id(id, full_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []) as unknown as NotificationWithRecipient[];
}

export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) throw error;
  return count ?? 0;
}
