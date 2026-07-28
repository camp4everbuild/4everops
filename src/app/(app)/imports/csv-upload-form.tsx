"use client";

import { useRef, useState, useTransition } from "react";
import { importPendingRows } from "@/lib/actions/imports";
import { parseCsvWithHeader } from "@/lib/csv";
import { Button, ErrorText, Field, inputClass } from "@/components/ui";

/**
 * Expects a header row with "title" (or "item") and optionally "description"
 * (or "notes") columns — covers both a plain task list and a kitchen menu
 * (each dish/prep item becomes one row) with the same two columns.
 */
export function CsvUploadForm() {
  const [batchLabel, setBatchLabel] = useState("");
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

    const label = batchLabel.trim() || file.name.replace(/\.csv$/i, "");

    startTransition(async () => {
      const text = await file.text();
      const records = parseCsvWithHeader(text);
      const rows = records.map((record) => ({
        title: record.title || record.item || "",
        description: record.description || record.notes || null,
      }));

      const result = await importPendingRows(label, rows);
      if (result.error) {
        setError(result.error);
        return;
      }
      setBatchLabel("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <Field label="Batch label" hint="Optional — defaults to the file name">
        <input
          className={inputClass}
          value={batchLabel}
          onChange={(e) => setBatchLabel(e.target.value)}
          placeholder="Dinner menu — Jul 28"
        />
      </Field>

      <Field label="CSV file" hint='Columns: "title" (or "item"), optional "description" (or "notes")'>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="block w-full text-sm text-muted file:mr-3 file:min-h-9 file:cursor-pointer file:rounded-lg file:border file:border-border file:bg-background file:px-3 file:text-sm file:font-medium file:text-foreground"
        />
      </Field>

      <ErrorText>{error}</ErrorText>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Uploading…" : "Upload"}
      </Button>
    </form>
  );
}
