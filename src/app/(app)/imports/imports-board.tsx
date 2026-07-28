"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/ui";
import { CsvUploadForm } from "./csv-upload-form";
import { ImportRow } from "./import-row";
import type { PendingImport, Profile } from "@/lib/types";

export function ImportsBoard({
  initialItems,
  assignableProfiles,
}: {
  initialItems: PendingImport[];
  assignableProfiles: Profile[];
}) {
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    const supabase = createClient();

    // pending_imports rows carry no joined data, so the realtime payload is
    // already everything we need — no follow-up fetch like tasks/jobs need.
    const channel = supabase
      .channel("imports-board")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pending_imports" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id: string };
            setItems((current) => current.filter((i) => i.id !== oldRow.id));
            return;
          }

          const row = payload.new as PendingImport;
          setItems((current) =>
            current.some((i) => i.id === row.id)
              ? current.map((i) => (i.id === row.id ? row : i))
              : [row, ...current],
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const batches = Array.from(new Set(items.map((i) => i.batch_label)));

  return (
    <div className="space-y-6">
      <CsvUploadForm />

      {items.length === 0 ? (
        <EmptyState>Nothing waiting on review.</EmptyState>
      ) : (
        batches.map((batch) => (
          <section key={batch}>
            <h2 className="mb-3 text-sm font-medium text-muted">{batch}</h2>
            <div className="space-y-2">
              {items
                .filter((i) => i.batch_label === batch)
                .map((item) => (
                  <ImportRow key={item.id} item={item} assignableProfiles={assignableProfiles} />
                ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
