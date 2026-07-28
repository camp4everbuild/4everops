"use client";

import { saveSubscription, removeSubscription } from "@/lib/actions/push";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function isPushSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** iOS only supports push for installed (Home Screen) PWAs — plain Safari tabs can't. */
export function iosNeedsInstall() {
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  return isIos && !isStandalone;
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.register("/sw.js");
  return registration.pushManager.getSubscription();
}

export async function subscribeToPush(): Promise<{ error: string | null }> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { error: "Notifications were blocked. You can re-enable them in your browser's site settings." };
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) return { error: "Push isn't configured yet." };

  const registration = await navigator.serviceWorker.ready;
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
    await subscription.unsubscribe();
    return result;
  }
  return { error: null };
}

export async function unsubscribeFromPush(): Promise<{ error: string | null }> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await removeSubscription(subscription.endpoint);
    await subscription.unsubscribe();
  }
  return { error: null };
}
