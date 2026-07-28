"use client";

import { useEffect } from "react";

/**
 * Registers the service worker on every page (not just when push status is
 * checked) and reloads once when a new version takes control — otherwise
 * skipWaiting()/clients.claim() in sw.js only swap which SW is "active";
 * the already-loaded page keeps running the old JS bundle until something
 * actually reloads it. Without this, updating meant deleting and
 * reinstalling the PWA to see new code.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let reloaded = false;
    function handleControllerChange() {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    }
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    navigator.serviceWorker.register("/sw.js").then((registration) => {
      // Browsers already check for a new sw.js on navigation; this catches
      // updates during a long-lived session (the app left open all day)
      // where no navigation happens to trigger that check on its own.
      const interval = setInterval(() => registration.update(), 60 * 60 * 1000);
      return () => clearInterval(interval);
    });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  return null;
}
