"use client";

import { useEffect, useState } from "react";
import { SunIcon, MoonIcon } from "@/components/icons";

type Theme = "light" | "dark" | "system";

function apply(theme: Theme) {
  if (theme === "system") {
    delete document.documentElement.dataset.theme;
    localStorage.removeItem("theme");
  } else {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }
}

export function ThemeToggle() {
  // Starts "system" so server/client markup match; the blocking script in
  // the root layout already set the real attribute before paint, this just
  // syncs the UI's selected state to whatever that ended up being.
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    // One-time read of a browser-only value (localStorage isn't available
    // during SSR) to sync the toggle's highlighted button to whatever the
    // blocking script already applied — not state derived from props/state,
    // so the usual "don't setState in an effect" alternative doesn't apply.
    const stored = localStorage.getItem("theme");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);

  function select(next: Theme) {
    setTheme(next);
    apply(next);
  }

  const OPTIONS: { value: Theme; label: string; icon: typeof SunIcon }[] = [
    { value: "light", label: "Light", icon: SunIcon },
    { value: "dark", label: "Dark", icon: MoonIcon },
    { value: "system", label: "Auto", icon: SunIcon },
  ];

  return (
    <div className="inline-flex items-center gap-0.5 rounded-full bg-background p-0.5">
      {OPTIONS.map((opt) => {
        const active = theme === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => select(opt.value)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition active:scale-[0.97] ${
              active ? "bg-accent text-accent-fg shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
