"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "@/components/icons";

/**
 * A real modal — backdrop blur, animated in/out, Escape + backdrop-click to
 * close — instead of a form just appearing inline in a plain box. Renders
 * via a portal so it isn't clipped by any ancestor's overflow/stacking
 * context, and slides up from the bottom on phones (the primary surface for
 * this app) vs. a centered dialog on wider screens.
 */
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  /** Function-as-children so content can trigger the same animated close (e.g. "on save"), not just the backdrop/Escape/X. */
  children: (requestClose: () => void) => ReactNode;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Mount at opacity-0 / translated, then flip a frame later so the
    // transition classes actually animate instead of snapping straight in.
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") requestClose();
    }
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function requestClose() {
    setVisible(false);
    setTimeout(onClose, 150);
  }

  // Client components still get an initial server render; document.body
  // doesn't exist there, and in real usage this is always mounted after a
  // user click anyway (never part of the initial page load).
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-150 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
        onClick={requestClose}
      />

      <div
        className={`relative w-full max-w-sm rounded-t-3xl border border-border bg-surface p-6 shadow-xl transition-all duration-150 sm:rounded-3xl ${
          visible
            ? "translate-y-0 opacity-100"
            : "translate-y-4 opacity-0 sm:translate-y-0 sm:scale-95"
        }`}
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-border/40 hover:text-foreground"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        {children(requestClose)}
      </div>
    </div>,
    document.body,
  );
}
