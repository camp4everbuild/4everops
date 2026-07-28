"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { OVERSIGHT_ROLES, type UserRole } from "@/lib/types";
import { HomeIcon, CalendarIcon, TeamIcon } from "@/components/icons";

const ITEMS: {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  roles?: UserRole[];
}[] = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/today", label: "Today", icon: CalendarIcon },
  { href: "/team", label: "Team", icon: TeamIcon, roles: OVERSIGHT_ROLES },
];

export function BottomNav({ roles }: { roles: UserRole[] }) {
  const pathname = usePathname();
  const items = ITEMS.filter(
    (item) => !item.roles || item.roles.some((r) => roles.includes(r)),
  );

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface/95 backdrop-blur">
      <div
        className="mx-auto flex w-full max-w-3xl items-stretch justify-around"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {items.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                active ? "text-accent" : "text-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-6 w-6" strokeWidth={active ? 2 : 1.75} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
