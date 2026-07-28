"use client";

import { useState, useTransition } from "react";
import { updateUserRoles } from "@/lib/actions/admin";
import { Card } from "@/components/ui";
import type { Profile, UserRole } from "@/lib/types";
import { RolePicker } from "./role-picker";

export function TeamRoster({ profiles }: { profiles: Profile[] }) {
  return (
    <div className="space-y-2">
      {profiles.map((profile) => (
        <RosterRow key={profile.id} profile={profile} />
      ))}
    </div>
  );
}

function RosterRow({ profile }: { profile: Profile }) {
  const [roles, setRoles] = useState<UserRole[]>(profile.roles);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: UserRole[]) {
    if (next.length === 0) return; // must keep at least one role
    const previous = roles;
    setRoles(next);
    setError(null);
    startTransition(async () => {
      const result = await updateUserRoles(profile.id, next);
      if (result.error) {
        setRoles(previous);
        setError(result.error);
      }
    });
  }

  return (
    <Card className="space-y-2">
      <div>
        <p className="font-medium">{profile.full_name}</p>
        {profile.phone ? <p className="text-xs text-muted">{profile.phone}</p> : null}
        {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
      </div>
      <RolePicker selected={roles} onChange={handleChange} disabled={isPending} />
    </Card>
  );
}
