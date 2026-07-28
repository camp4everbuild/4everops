"use client";

import { useState, useTransition } from "react";
import { updateOwnProfile } from "@/lib/actions/profile";
import { Button, ErrorText, Field, inputClass } from "@/components/ui";
import type { Profile } from "@/lib/types";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [emergencyName, setEmergencyName] = useState(profile.emergency_contact_name ?? "");
  const [emergencyPhone, setEmergencyPhone] = useState(profile.emergency_contact_phone ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateOwnProfile({
        fullName,
        phone: phone || null,
        tshirtSize: profile.tshirt_size,
        emergencyContactName: emergencyName || null,
        emergencyContactPhone: emergencyPhone || null,
      });
      if (result.error) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Full name">
        <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      </Field>

      <Field label="Phone">
        <input
          className={inputClass}
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </Field>

      <Field label="Emergency contact name" hint="Optional">
        <input
          className={inputClass}
          value={emergencyName}
          onChange={(e) => setEmergencyName(e.target.value)}
        />
      </Field>

      <Field label="Emergency contact phone" hint="Optional">
        <input
          className={inputClass}
          type="tel"
          value={emergencyPhone}
          onChange={(e) => setEmergencyPhone(e.target.value)}
        />
      </Field>

      <ErrorText>{error}</ErrorText>
      {saved && !error ? <p className="text-sm text-emerald-600 dark:text-emerald-400">Saved.</p> : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
