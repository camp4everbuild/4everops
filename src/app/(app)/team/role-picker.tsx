"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@/components/icons";
import { ROLE_LABELS, type UserRole } from "@/lib/types";

const ALL_ROLES = Object.keys(ROLE_LABELS) as UserRole[];

/** A person can hold more than one role, so this is a collapsed multi-select — a dropdown checklist, not a dropdown of one value. */
export function RolePicker({
  selected,
  onChange,
  disabled,
}: {
  selected: UserRole[];
  onChange: (roles: UserRole[]) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggle(role: UserRole) {
    onChange(
      selected.includes(role) ? selected.filter((r) => r !== role) : [...selected, role],
    );
  }

  const label = selected.length === 0 ? "No roles" : selected.map((r) => ROLE_LABELS[r]).join(", ");

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-9 w-full items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 text-left text-sm outline-none transition-shadow focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-50"
      >
        <span className="truncate">{label}</span>
        <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted" />
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-border bg-surface p-1.5 shadow-lg shadow-black/10">
          {ALL_ROLES.map((role) => (
            <label
              key={role}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-border/40"
            >
              <input
                type="checkbox"
                checked={selected.includes(role)}
                onChange={() => toggle(role)}
                className="h-4 w-4 accent-accent"
              />
              {ROLE_LABELS[role]}
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
