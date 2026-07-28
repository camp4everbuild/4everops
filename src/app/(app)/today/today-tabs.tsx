"use client";

import { useState, type ReactNode } from "react";
import { TabBar } from "@/components/ui";

type Tab = "checklist" | "schedule" | "cots";

export function TodayTabs({
  checklist,
  schedule,
  cots,
}: {
  checklist: ReactNode;
  schedule: ReactNode;
  cots: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("checklist");

  return (
    <div>
      <TabBar
        tabs={[
          { id: "checklist", label: "Checklist" },
          { id: "schedule", label: "Schedule" },
          { id: "cots", label: "Cots" },
        ]}
        value={tab}
        onChange={setTab}
      />
      <div className={tab === "checklist" ? "" : "hidden"}>{checklist}</div>
      <div className={tab === "schedule" ? "" : "hidden"}>{schedule}</div>
      <div className={tab === "cots" ? "" : "hidden"}>{cots}</div>
    </div>
  );
}
