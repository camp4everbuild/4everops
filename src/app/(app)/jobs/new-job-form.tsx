"use client";

import { useState, useTransition } from "react";
import { createJob } from "@/lib/actions/jobs";
import { Button, ErrorText, Field, inputClass, textareaClass } from "@/components/ui";

export function NewJobForm({ onDone }: { onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createJob({ title, description: description || null });
      if (result.error) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="What needs doing">
        <input
          className={inputClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Walmart run for more drinks…"
          autoFocus
          required
        />
      </Field>

      <Field label="Details" hint="Optional">
        <textarea
          className={textareaClass}
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>

      <ErrorText>{error}</ErrorText>

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Posting…" : "Post job"}
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
