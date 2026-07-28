"use client";

import { useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { BellIcon } from "@/components/icons";
import { useSyncedState } from "@/lib/use-synced-state";

export function NotificationBell({
  userId,
  initialUnread,
}: {
  userId: string;
  initialUnread: number;
}) {
  const [unread, setUnread] = useSyncedState(initialUnread);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => setUnread((count) => count + 1),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new.is_read) setUnread((count) => Math.max(0, count - 1));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, setUnread]);

  return (
    <Link
      href="/notifications"
      className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted hover:bg-border/40 hover:text-foreground"
      aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
    >
      <BellIcon className="h-5 w-5" />
      {unread > 0 ? (
        <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
