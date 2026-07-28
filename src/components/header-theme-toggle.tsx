"use client";

import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "@/components/icons";

/**
 * Compact single-icon theme switcher for the top bar — flips between an
 * explicit light/dark (bypassing "system"). The full 3-way Light/Dark/Auto
 * control stays on the Profile page for anyone who wants to go back to
 * following the OS setting.
 */
export function HeaderThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const resolved = stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(resolved);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      type="button"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
      className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-border/40 hover:text-foreground"
    >
      {dark ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />}
    </button>
  );
}
