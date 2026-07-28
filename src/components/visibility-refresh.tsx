"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Mobile Safari (and PWAs generally) freeze/drop the Realtime WebSocket
 * when the app is backgrounded — reopening it doesn't reliably resume
 * delivery, so a change made while you were away (or made elsewhere while
 * your socket was dead) never arrives. Boards were then relying entirely on
 * that socket, so they'd sit stale until something forced a remount.
 *
 * This re-fetches the current route's server data as soon as the app comes
 * back to the foreground — a reliable catch-up independent of whether the
 * socket actually reconnected. Each board's own resync-from-props effect
 * (see e.g. home-board.tsx) is what turns that fresh data into an updated
 * screen.
 */
export function VisibilityRefresh() {
  const router = useRouter();

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [router]);

  return null;
}
