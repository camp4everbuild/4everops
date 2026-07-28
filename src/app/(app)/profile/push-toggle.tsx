"use client";

import { useEffect, useState } from "react";
import { saveSubscription, removeSubscription } from "@/lib/actions/push";
import { Button, ErrorText } from "@/components/ui";

type Status = "checking" | "unsupported" | "ios-needs-install" | "subscribed" | "unsubscribed";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function isIosSafari() {
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  return isIos && !isStandalone;
}

export function PushToggle() {
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function check() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setStatus("unsupported");
        return;
      }
      if (isIosSafari()) {
        setStatus("ios-needs-install");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const existing = await registration.pushManager.getSubscription();
      setStatus(existing ? "subscribed" : "unsubscribed");
    }
    check().catch(() => setStatus("unsupported"));
  }, []);

  async function handleEnable() {
    setError(null);
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Notifications were blocked. You can re-enable them in your browser's site settings.");
        setBusy(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Push isn't configured yet.");

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const json = subscription.toJSON();
      const result = await saveSubscription({
        endpoint: subscription.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        authKey: json.keys?.auth ?? "",
      });

      if (result.error) {
        setError(result.error);
        await subscription.unsubscribe();
        setStatus("unsubscribed");
      } else {
        setStatus("subscribed");
      }
    } catch {
      setError("Couldn't enable notifications. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setError(null);
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await removeSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setStatus("unsubscribed");
    } catch {
      setError("Couldn't turn off notifications. Try again in a moment.");
    } finally {
      setBusy(false);
    }
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
          {status === "subscribed" ? "Notifications are on for this device." : "Get notified about new tasks, jobs, and approvals — even when the app is closed."}
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
