"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { completeOnboarding } from "@/lib/actions/onboarding";
import type { ActionResult } from "@/lib/actions/types";
import { formatPhone, digitsOnly } from "@/lib/format";
import { Button, ErrorText, Field, inputClass } from "@/components/ui";

const initialState: ActionResult = { error: null };

export function OnboardingForm({
  defaultFirstName,
  defaultLastName,
}: {
  defaultFirstName: string;
  defaultLastName: string;
}) {
  const [state, formAction] = useActionState(completeOnboarding, initialState);
  const [phone, setPhone] = useState("");

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name">
          <input
            className={inputClass}
            name="firstName"
            defaultValue={defaultFirstName}
            autoComplete="given-name"
            autoCapitalize="words"
            required
          />
        </Field>
        <Field label="Last name">
          <input
            className={inputClass}
            name="lastName"
            defaultValue={defaultLastName}
            autoComplete="family-name"
            autoCapitalize="words"
            required
          />
        </Field>
      </div>

      <Field label="Phone number">
        <input
          className={inputClass}
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="(555) 123-4567"
          value={phone}
          onChange={(e) => setPhone(formatPhone(digitsOnly(e.target.value)))}
          required
        />
      </Field>

      <ErrorText>{state.error}</ErrorText>

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Saving…" : "Continue"}
    </Button>
  );
}
