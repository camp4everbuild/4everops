"use client";

import { useEffect, useState } from "react";
import { isPushSupported, iosNeedsInstall, getExistingSubscription, subscribeToPush } from "@/lib/push-client";
import { BellIcon } from "@/components/icons";

// localStorage, not sessionStorage — a one-time ask. "Not now" or Allow
// both count as a real decision and neither should nag again. This key is
// new (distinct from the old banner's), so it re-asks once for everyone,
// including accounts that already dismissed the old banner.
const DISMISSED_KEY = "push-prompt-decided-v2";

/**
 * Blocks the app on load (no X, no backdrop-click, no Escape) the first
 * time someone opens the app after this shipped — every existing account
 * gets this once, not just new signups, since the check is purely
 * permission/localStorage-based rather than tied to when they signed up.
 * Doesn't fire the native permission dialog on its own — some browsers
 * (Safari) ignore requestPermission() calls that aren't triggered by a real
 * tap, so this screen IS that tap: one deliberate interaction, then the
 * real OS prompt.
 */
export function PushPrompt() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function check() {
      if (localStorage.getItem(DISMISSED_KEY)) return;
      if (!isPushSupported() || iosNeedsInstall()) return;
      if (Notification.permission !== "default") return;

      const existing = await getExistingSubscription();
      if (!existing) setVisible(true);
    }
    check().catch(() => {});
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  }

  async function enable() {
    setBusy(true);
    setError(null);
    const result = await subscribeToPush();
    if (result.error) {
      setError(result.error);
      setBusy(false);
      return;
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div className="relative w-full max-w-sm rounded-3xl border border-border bg-surface p-6 shadow-xl">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-accent">
          <BellIcon className="h-5 w-5" />
        </span>
        <h2 className="mt-3 text-lg font-semibold tracking-tight">Turn on notifications</h2>
        <p className="mt-1 text-sm text-muted">
          Get notified about new tasks, jobs, and approvals — even when the app is closed. You can
          change this later in Profile.
        </p>
        {error ? <p className="mt-2 text-xs text-red-500">{error}</p> : null}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={enable}
            className="min-h-11 flex-1 rounded-xl bg-accent px-4 text-sm font-medium text-accent-fg shadow-sm shadow-accent/30 transition active:scale-[0.97] disabled:opacity-50"
          >
            {busy ? "Enabling…" : "Allow notifications"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={dismiss}
            className="min-h-11 rounded-xl border border-border px-4 text-sm font-medium text-muted transition hover:text-foreground disabled:opacity-50"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
