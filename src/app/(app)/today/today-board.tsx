"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/ui";
import { DEPARTMENT_LABELS, ROLE_DEPARTMENT, type ChecklistItemWithAssignee, type Department, type Profile } from "@/lib/types";
import { ChecklistItemRow } from "./checklist-item-row";

const SELECT_WITH_ASSIGNEE = "*, assignee:assigned_to(id, full_name)";

export function TodayBoard({
  checklistId,
  initialItems,
  isOversightUser,
  activeProfiles,
}: {
  checklistId: string;
  initialItems: ChecklistItemWithAssignee[];
  isOversightUser: boolean;
  activeProfiles: Profile[];
}) {
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    const supabase = createClient();

    async function fetchFull(id: string) {
      const { data } = await supabase
        .from("checklist_items")
        .select(SELECT_WITH_ASSIGNEE)
        .eq("id", id)
        .maybeSingle();
      if (data) {
        const full = data as unknown as ChecklistItemWithAssignee;
        setItems((current) =>
          current.some((i) => i.id === full.id)
            ? current.map((i) => (i.id === full.id ? full : i))
            : [...current, full],
        );
      }
    }

    const channel = supabase
      .channel(`today-${checklistId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "checklist_items", filter: `checklist_id=eq.${checklistId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id: string };
            setItems((current) => current.filter((i) => i.id !== oldRow.id));
            return;
          }

          if (payload.eventType === "INSERT") {
            fetchFull((payload.new as { id: string }).id);
            return;
          }

          const row = payload.new as ChecklistItemWithAssignee;
          setItems((current) => {
            if (!current.some((i) => i.id === row.id)) {
              fetchFull(row.id);
              return current;
            }
            return current.map((i) => (i.id === row.id ? { ...i, ...row } : i));
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [checklistId]);

  const departments = Array.from(new Set(items.map((i) => i.department))) as Department[];

  if (items.length === 0) {
    return <EmptyState>Today&apos;s checklist is empty.</EmptyState>;
  }

  return (
    <div className="space-y-6">
      {departments.map((department) => {
        const departmentItems = items
          .filter((i) => i.department === department)
          .sort((a, b) => a.sort_order - b.sort_order);
        const candidates = activeProfiles.filter((p) =>
          p.roles.some((r) => ROLE_DEPARTMENT[r] === department),
        );

        return (
          <section key={department}>
            <h2 className="mb-3 text-sm font-medium text-muted">
              {DEPARTMENT_LABELS[department]}
            </h2>
            <div className="space-y-2">
              {departmentItems.map((item) => (
                <ChecklistItemRow
                  key={item.id}
                  item={item}
                  candidates={candidates}
                  canAssign={isOversightUser}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
