"use client";

import { useEffect, useState } from "react";

/**
 * Small pulsing dot reflecting actual browser connectivity — green while
 * online, red while offline. Starts "online" so server/client markup
 * match, then a one-time browser-only read (navigator.onLine isn't
 * available during SSR) corrects it before anything else runs.
 */
export function LiveIndicator() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOnline(navigator.onLine);

    function goOnline() {
      setOnline(true);
    }
    function goOffline() {
      setOnline(false);
    }
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return (
    <span
      className="flex h-8 w-8 items-center justify-center"
      title={online ? "Live" : "Offline"}
      aria-label={online ? "Live" : "Offline"}
    >
      <span className="relative flex h-2.5 w-2.5">
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
            online ? "bg-emerald-500" : "bg-red-500"
          }`}
        />
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${online ? "bg-emerald-500" : "bg-red-500"}`}
        />
      </span>
    </span>
  );
}
