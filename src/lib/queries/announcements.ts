import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Announcement } from "@/lib/types";

export type AnnouncementWithAck = Announcement & { acknowledged: boolean };

export async function getAnnouncements(userId: string): Promise<AnnouncementWithAck[]> {
  const supabase = await createClient();

  const [{ data: announcements, error: announcementsError }, { data: acks, error: acksError }] =
    await Promise.all([
      supabase.from("announcements").select("*").order("created_at", { ascending: false }),
      supabase.from("announcement_acknowledgments").select("announcement_id").eq("user_id", userId),
    ]);

  if (announcementsError) throw announcementsError;
  if (acksError) throw acksError;

  const ackedIds = new Set((acks ?? []).map((a) => a.announcement_id));

  return ((announcements ?? []) as Announcement[]).map((a) => ({
    ...a,
    acknowledged: ackedIds.has(a.id),
  }));
}
