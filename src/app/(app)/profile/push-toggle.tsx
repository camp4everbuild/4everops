"use client";

import { useEffect, useState } from "react";
import {
  isPushSupported,
  iosNeedsInstall,
  getExistingSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push-client";
import { Button, ErrorText } from "@/components/ui";

type Status = "checking" | "unsupported" | "ios-needs-install" | "subscribed" | "unsubscribed";

export function PushToggle() {
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function check() {
      if (!isPushSupported()) {
        setStatus("unsupported");
        return;
      }
      if (iosNeedsInstall()) {
        setStatus("ios-needs-install");
        return;
      }
      const existing = await getExistingSubscription();
      setStatus(existing ? "subscribed" : "unsubscribed");
    }
    check().catch(() => setStatus("unsupported"));
  }, []);

  async function handleEnable() {
    setError(null);
    setBusy(true);
    const result = await subscribeToPush();
    if (result.error) setError(result.error);
    else setStatus("subscribed");
    setBusy(false);
  }

  async function handleDisable() {
    setError(null);
    setBusy(true);
    const result = await unsubscribeFromPush();
    if (result.error) setError(result.error);
    else setStatus("unsubscribed");
    setBusy(false);
  }

  if (status === "checking") return null;

  if (status === "unsupported") {
    return <p className="text-sm text-muted">Push notifications aren&apos;t supported on this browser.</p>;
  }

  if (status === "ios-needs-install") {
    return (
      <p className="text-sm text-muted">
        On iPhone, push notifications only work once you&apos;ve added this app to your Home
        Screen — tap the Share button in Safari, then &quot;Add to Home Screen&quot;, and open it
        from there.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm">
          {status === "subscribed"
            ? "Notifications are on for this device."
            : "Get notified about new tasks, jobs, and approvals — even when the app is closed."}
        </p>
        <Button
          variant={status === "subscribed" ? "secondary" : "primary"}
          disabled={busy}
          onClick={status === "subscribed" ? handleDisable : handleEnable}
        >
          {busy ? "…" : status === "subscribed" ? "Turn off" : "Enable"}
        </Button>
      </div>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}
