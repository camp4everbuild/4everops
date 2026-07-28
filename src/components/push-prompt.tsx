"use client";

import { useEffect, useState } from "react";
import { isPushSupported, iosNeedsInstall, getExistingSubscription, subscribeToPush } from "@/lib/push-client";
import { BellIcon, XIcon } from "@/components/icons";

const DISMISSED_KEY = "push-prompt-dismissed";

/**
 * Shows itself automatically on load (no need to find it in Profile) when
 * push is available but not yet decided one way or the other. Doesn't fire
 * the native permission dialog on its own — some browsers (Safari) ignore
 * requestPermission() calls that aren't triggered by a real tap, so this
 * banner IS that tap: one deliberate interaction, then the real prompt.
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
    <div className="shell-content pt-3">
      <div className="flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent/10 p-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
          <BellIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Turn on notifications</p>
          <p className="mt-0.5 text-sm text-muted">
            Get notified about new tasks, jobs, and approvals — even when the app is closed.
          </p>
          {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={enable}
              className="min-h-9 rounded-lg bg-accent px-3 text-sm font-medium text-accent-fg transition active:scale-[0.97] disabled:opacity-50"
            >
              {busy ? "Enabling…" : "Allow"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={dismiss}
              className="min-h-9 rounded-lg px-3 text-sm font-medium text-muted transition hover:text-foreground"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismiss}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted hover:bg-border/40 hover:text-foreground"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
