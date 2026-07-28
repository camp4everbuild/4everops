"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  addScheduleStop,
  assignScheduleStop,
  deleteScheduleStop,
  importScheduleStops,
} from "@/lib/actions/schedule";
import { parseCsvWithHeader } from "@/lib/csv";
import { mapsUrl, wazeUrl } from "@/lib/maps";
import { Button, Card, EmptyState, ErrorText, Field, Select, inputClass, textareaClass } from "@/components/ui";
import { Modal } from "@/components/modal";
import { PersonIcon, PinIcon, SwapIcon, TrashIcon } from "@/components/icons";
import type { Profile, ScheduleStopWithAssignee } from "@/lib/types";

const SELECT_WITH_ASSIGNEE = "*, assignee:assigned_to(id, full_name)";

export function ScheduleSection({
  travelDate,
  initialStops,
  assignableProfiles,
  canManage,
}: {
  travelDate: string;
  initialStops: ScheduleStopWithAssignee[];
  assignableProfiles: Profile[];
  canManage: boolean;
}) {
  const [stops, setStops] = useState(initialStops);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();

    async function fetchFull(id: string) {
      const { data } = await supabase
        .from("schedule_stops")
        .select(SELECT_WITH_ASSIGNEE)
        .eq("id", id)
        .maybeSingle();
      if (data) {
        const full = data as unknown as ScheduleStopWithAssignee;
        setStops((current) =>
          current.some((s) => s.id === full.id)
            ? current.map((s) => (s.id === full.id ? full : s))
            : [...current, full].sort((a, b) => a.sort_order - b.sort_order),
        );
      }
    }

    const channel = supabase
      .channel(`schedule-${travelDate}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "schedule_stops", filter: `travel_date=eq.${travelDate}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id: string };
            setStops((current) => current.filter((s) => s.id !== oldRow.id));
            return;
          }
          fetchFull((payload.new as { id: string }).id);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [travelDate]);

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteScheduleStop(id);
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
            <StopCard
              key={stop.id}
              stop={stop}
              assignableProfiles={assignableProfiles}
              canManage={canManage}
              onDelete={() => handleDelete(stop.id)}
            />
          ))}
        </div>
      )}

      {open ? (
        <Modal title="Add stop" onClose={() => setOpen(false)}>
          {(requestClose) => (
            <AddStopForm
              travelDate={travelDate}
              nextSortOrder={stops.length}
              assignableProfiles={assignableProfiles}
              onDone={requestClose}
            />
          )}
        </Modal>
      ) : null}

      {importOpen ? (
        <Modal title="Import today's schedule" onClose={() => setImportOpen(false)}>
          {(requestClose) => <ImportStopsForm travelDate={travelDate} onDone={requestClose} />}
        </Modal>
      ) : null}
    </section>
  );
}

function StopCard({
  stop,
  assignableProfiles,
  canManage,
  onDelete,
}: {
  stop: ScheduleStopWithAssignee;
  assignableProfiles: Profile[];
  canManage: boolean;
  onDelete: () => void;
}) {
  const [assigning, setAssigning] = useState(false);
  const [assignTo, setAssignTo] = useState(stop.assigned_to ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAssign() {
    setError(null);
    startTransition(async () => {
      const result = await assignScheduleStop(stop.id, assignTo || null);
      if (result.error) setError(result.error);
      else setAssigning(false);
    });
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">
            {stop.label}
            {stop.time ? <span className="ml-2 text-xs font-normal text-muted">{stop.time}</span> : null}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
            <PinIcon className="h-3.5 w-3.5 shrink-0" />
            {stop.address}
          </p>
          {stop.notes ? <p className="mt-1 text-xs text-muted">{stop.notes}</p> : null}
          {stop.assignee ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-muted">
              <PersonIcon className="h-3.5 w-3.5" />
              {stop.assignee.full_name}
            </p>
          ) : null}
        </div>

        {canManage ? (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label="Assign stop"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-border/40 hover:text-foreground"
              onClick={() => setAssigning((v) => !v)}
            >
              <SwapIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Delete stop"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-red-500/10 hover:text-red-500"
              onClick={onDelete}
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>

      {assigning ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Select small className="min-w-0 flex-1" value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
            <option value="">Unassigned</option>
            {assignableProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </Select>
          <Button disabled={isPending} onClick={handleAssign}>
            Save
          </Button>
        </div>
      ) : null}

      <ErrorText>{error}</ErrorText>

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
  assignableProfiles,
  onDone,
}: {
  travelDate: string;
  nextSortOrder: number;
  assignableProfiles: Profile[];
  onDone: () => void;
}) {
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
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
        assignedTo: assignedTo || null,
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

      <div className="grid grid-cols-2 gap-3">
        <Field label="Time" hint="Optional">
          <input className={inputClass} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>

        <Field label="Assign to" hint="Optional">
          <Select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
            <option value="">Unassigned</option>
            {assignableProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

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
