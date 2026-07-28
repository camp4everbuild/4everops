"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addScheduleStop, deleteScheduleStop, importScheduleStops } from "@/lib/actions/schedule";
import { parseCsvWithHeader } from "@/lib/csv";
import { mapsUrl, wazeUrl } from "@/lib/maps";
import { Button, Card, EmptyState, ErrorText, Field, inputClass, textareaClass } from "@/components/ui";
import { Modal } from "@/components/modal";
import { PinIcon, TrashIcon } from "@/components/icons";
import type { ScheduleStop } from "@/lib/types";

export function ScheduleSection({
  travelDate,
  stops,
  canManage,
}: {
  travelDate: string;
  stops: ScheduleStop[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [, startTransition] = useTransition();

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteScheduleStop(id);
      router.refresh();
    });
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted">Schedule</h2>
        {canManage ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="text-sm font-medium text-accent hover:opacity-80"
              onClick={() => setImportOpen(true)}
            >
              Import CSV
            </button>
            <button
              type="button"
              className="text-sm font-medium text-accent hover:opacity-80"
              onClick={() => setOpen(true)}
            >
              + Add stop
            </button>
          </div>
        ) : null}
      </div>

      {stops.length === 0 ? (
        <EmptyState>No stops entered for today yet.</EmptyState>
      ) : (
        <div className="space-y-2">
          {stops.map((stop) => (
            <Card key={stop.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {stop.label}
                    {stop.time ? (
                      <span className="ml-2 text-xs font-normal text-muted">{stop.time}</span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
                    <PinIcon className="h-3.5 w-3.5 shrink-0" />
                    {stop.address}
                  </p>
                  {stop.notes ? <p className="mt-1 text-xs text-muted">{stop.notes}</p> : null}
                </div>
                {canManage ? (
                  <button
                    type="button"
                    aria-label="Delete stop"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-red-500/10 hover:text-red-500"
                    onClick={() => handleDelete(stop.id)}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              <div className="mt-3 flex gap-2">
                <a
                  href={mapsUrl(stop.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-9 flex-1 items-center justify-center rounded-lg border border-border bg-surface px-3 text-xs font-medium transition hover:bg-border/40"
                >
                  Google Maps
                </a>
                <a
                  href={wazeUrl(stop.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-9 flex-1 items-center justify-center rounded-lg border border-border bg-surface px-3 text-xs font-medium transition hover:bg-border/40"
                >
                  Waze
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}

      {open ? (
        <Modal title="Add stop" onClose={() => setOpen(false)}>
          {(requestClose) => (
            <AddStopForm
              travelDate={travelDate}
              nextSortOrder={stops.length}
              onDone={() => {
                requestClose();
                router.refresh();
              }}
            />
          )}
        </Modal>
      ) : null}

      {importOpen ? (
        <Modal title="Import today's schedule" onClose={() => setImportOpen(false)}>
          {(requestClose) => (
            <ImportStopsForm
              travelDate={travelDate}
              onDone={() => {
                requestClose();
                router.refresh();
              }}
            />
          )}
        </Modal>
      ) : null}
    </section>
  );
}

function ImportStopsForm({
  travelDate,
  onDone,
}: {
  travelDate: string;
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a CSV file first.");
      return;
    }

    startTransition(async () => {
      const text = await file.text();
      const records = parseCsvWithHeader(text);
      const rows = records.map((record) => ({
        label: record.label || record.stop || "",
        address: record.address || "",
        time: record.time || null,
        notes: record.notes || null,
      }));

      const result = await importScheduleStops(travelDate, rows);
      if (result.error) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-muted">
        This replaces today&apos;s whole schedule with what&apos;s in the file.
      </p>

      <Field label="CSV file" hint='Columns: "label" (or "stop"), "address", optional "time", "notes"'>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="block w-full text-sm text-muted file:mr-3 file:min-h-9 file:cursor-pointer file:rounded-lg file:border file:border-border file:bg-background file:px-3 file:text-sm file:font-medium file:text-foreground"
        />
      </Field>

      <ErrorText>{error}</ErrorText>

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Importing…" : "Replace schedule"}
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function AddStopForm({
  travelDate,
  nextSortOrder,
  onDone,
}: {
  travelDate: string;
  nextSortOrder: number;
  onDone: () => void;
}) {
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addScheduleStop({
        travelDate,
        label,
        address,
        time: time || null,
        notes: notes || null,
        sortOrder: nextSortOrder,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Label">
        <input
          className={inputClass}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Lunch stop, Hotel, Trip location…"
          required
        />
      </Field>

      <Field label="Address">
        <input
          className={inputClass}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />
      </Field>

      <Field label="Time" hint="Optional">
        <input className={inputClass} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </Field>

      <Field label="Notes" hint="Optional">
        <textarea className={textareaClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>

      <ErrorText>{error}</ErrorText>

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Adding…" : "Add stop"}
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
