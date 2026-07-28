"use client";

import { useEffect, useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { checkCotOut, checkCotReturned, registerCot, deleteCot } from "@/lib/actions/cots";
import { Button, Card, EmptyState, ErrorText, inputClass } from "@/components/ui";
import { BedIcon, CheckIcon, TrashIcon } from "@/components/icons";
import type { Cot } from "@/lib/types";

export function CotsSection({
  initialCots,
  canManage,
}: {
  initialCots: Cot[];
  /** Director/head — can add or remove numbered cots from the roster. */
  canManage: boolean;
}) {
  const [cots, setCots] = useState(initialCots);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("cots-section")
      .on("postgres_changes", { event: "*", schema: "public", table: "cots" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const oldRow = payload.old as { id: string };
          setCots((current) => current.filter((c) => c.id !== oldRow.id));
          return;
        }

        const row = payload.new as Cot;
        setCots((current) =>
          current.some((c) => c.id === row.id)
            ? current.map((c) => (c.id === row.id ? row : c))
            : [...current, row].sort((a, b) => a.number - b.number),
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const nextNumber = cots.reduce((max, c) => Math.max(max, c.number), 0) + 1;

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-muted">Cots</h2>

      {cots.length === 0 ? (
        <EmptyState>No cots on the roster yet.</EmptyState>
      ) : (
        <div className="space-y-2">
          {cots.map((cot) => (
            <CotRow key={cot.id} cot={cot} canManage={canManage} />
          ))}
        </div>
      )}

      {canManage ? <AddCotForm suggestedNumber={nextNumber} /> : null}
    </section>
  );
}

function CotRow({ cot, canManage }: { cot: Cot; canManage: boolean }) {
  const [checkingOut, setCheckingOut] = useState(false);
  const [room, setRoom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    if (cot.is_out) {
      setError(null);
      startTransition(async () => {
        const result = await checkCotReturned(cot.id);
        if (result.error) setError(result.error);
      });
    } else {
      setCheckingOut(true);
    }
  }

  function handleConfirmOut(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await checkCotOut(cot.id, room);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCheckingOut(false);
      setRoom("");
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteCot(cot.id);
    });
  }

  return (
    <Card className={cot.is_out ? "border-2 border-amber-500/60! bg-amber-500/10!" : ""}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={cot.is_out ? "Mark returned" : "Mark given out"}
          disabled={isPending}
          onClick={handleToggle}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition active:scale-[0.95] disabled:opacity-50 ${
            cot.is_out
              ? "border-amber-500 bg-amber-500 text-white"
              : "border-border text-transparent hover:border-accent"
          }`}
        >
          <CheckIcon className="h-4 w-4" strokeWidth={2.5} />
        </button>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 font-medium">
            <BedIcon className="h-4 w-4 shrink-0 text-muted" />
            Cot #{cot.number}
          </p>
          {cot.is_out ? (
            <p className="text-xs text-muted">
              {cot.room_or_group} · given out{" "}
              {cot.given_at ? formatDistanceToNow(new Date(cot.given_at), { addSuffix: true }) : ""}
            </p>
          ) : (
            <p className="text-xs text-muted">Available</p>
          )}
        </div>

        {canManage ? (
          <button
            type="button"
            aria-label={`Remove cot #${cot.number}`}
            disabled={isPending}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
            onClick={handleDelete}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {checkingOut ? (
        <form onSubmit={handleConfirmOut} className="mt-3 flex gap-2">
          <input
            className={`${inputClass} min-w-0 flex-1`}
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="Room or cabin (e.g. Room 214)"
            autoFocus
            required
          />
          <Button type="submit" disabled={isPending} className="shrink-0">
            Confirm
          </Button>
        </form>
      ) : null}

      <ErrorText>{error}</ErrorText>
    </Card>
  );
}

function AddCotForm({ suggestedNumber }: { suggestedNumber: number }) {
  const [number, setNumber] = useState(String(suggestedNumber));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await registerCot(Number(number));
      if (result.error) {
        setError(result.error);
        return;
      }
      setNumber(String(Number(number) + 1));
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-wrap items-start gap-2">
      <input
        className={`${inputClass} min-w-0 flex-1`}
        type="number"
        min={1}
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        placeholder="Cot #"
        required
      />
      <Button type="submit" disabled={isPending} className="shrink-0">
        Add cot
      </Button>
      {error ? <ErrorText>{error}</ErrorText> : null}
    </form>
  );
}
