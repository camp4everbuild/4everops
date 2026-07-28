"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { approveUser } from "@/lib/actions/admin";
import { Card, EmptyState, Button } from "@/components/ui";
import type { Profile, UserRole } from "@/lib/types";
import { RolePicker } from "./role-picker";

export function PendingApprovals({ initialPending }: { initialPending: Profile[] }) {
  const [pending, setPending] = useState(initialPending);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("pending-profiles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as Partial<Profile>;
            setPending((current) => current.filter((p) => p.id !== oldRow.id));
            return;
          }

          const row = payload.new as Profile;
          setPending((current) => {
            if (row.status !== "pending") {
              return current.filter((p) => p.id !== row.id);
            }
            const exists = current.some((p) => p.id === row.id);
            return exists
              ? current.map((p) => (p.id === row.id ? row : p))
              : [...current, row];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (pending.length === 0) {
    return <EmptyState>No one is waiting on approval.</EmptyState>;
  }

  return (
    <div className="space-y-2">
      {pending.map((profile) => (
        <ApprovalRow key={profile.id} profile={profile} />
      ))}
    </div>
  );
}

function ApprovalRow({ profile }: { profile: Profile }) {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <Card className="space-y-3">
      <div>
        <p className="font-medium">{profile.full_name}</p>
        {profile.phone ? <p className="text-xs text-muted">{profile.phone}</p> : null}
        {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <RolePicker selected={roles} onChange={setRoles} disabled={isPending} />
        <Button
          disabled={isPending || roles.length === 0}
          onClick={() =>
            startTransition(async () => {
              const result = await approveUser(profile.id, roles);
              setError(result.error);
            })
          }
        >
          Approve
        </Button>
      </div>
    </Card>
  );
}
