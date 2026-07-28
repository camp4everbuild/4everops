"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { logCot, markCotReturned } from "@/lib/actions/cots";
import { Button, Card, EmptyState, ErrorText, inputClass } from "@/components/ui";
import { BedIcon } from "@/components/icons";
import type { CotLoan } from "@/lib/types";

export function CotsSection({ cots }: { cots: CotLoan[] }) {
  const router = useRouter();
  const [room, setRoom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleLog(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await logCot(room, null);
      if (result.error) {
        setError(result.error);
        return;
      }
      setRoom("");
      router.refresh();
    });
  }

  function handleReturn(id: string) {
    startTransition(async () => {
      await markCotReturned(id);
      router.refresh();
    });
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-muted">Cots out</h2>

      {cots.length === 0 ? (
        <EmptyState>No cots outstanding.</EmptyState>
      ) : (
        <div className="space-y-2">
          {cots.map((cot) => (
            <Card key={cot.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <BedIcon className="h-4 w-4 shrink-0 text-muted" />
                <div className="min-w-0">
                  <p className="truncate font-medium">{cot.room_or_group}</p>
                  <p className="text-xs text-muted">
                    Given out {formatDistanceToNow(new Date(cot.given_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                disabled={isPending}
                onClick={() => handleReturn(cot.id)}
              >
                Mark returned
              </Button>
            </Card>
          ))}
        </div>
      )}

      <form onSubmit={handleLog} className="mt-3 flex gap-2">
        <input
          className={inputClass}
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          placeholder="Room or cabin (e.g. Room 214)"
          required
        />
        <Button type="submit" disabled={isPending}>
          Log cot
        </Button>
      </form>
      <ErrorText>{error}</ErrorText>
    </section>
  );
}
