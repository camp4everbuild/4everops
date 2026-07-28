"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTemplate, startTodayChecklist } from "@/lib/actions/checklists";
import { Button, Card, ErrorText, Field, Select, inputClass } from "@/components/ui";
import { DEPARTMENT_LABELS, type ChecklistTemplate, type Department } from "@/lib/types";

const SUGGESTED_ITEMS: { title: string; department: Department }[] = [
  { title: "Load bus — snacks, drinks, medical bag, extra supplies", department: "support" },
  { title: "Hand out today's t-shirts", department: "counselors" },
  { title: "Have lunch ready for departure", department: "kitchen" },
  { title: "Pack lunch into the cargo van", department: "support" },
  { title: "Clean up the trip site", department: "support" },
  { title: "Set up the conference room for dinner", department: "support" },
  { title: "Cook dinner", department: "kitchen" },
  { title: "Serve dinner and clean up after", department: "support" },
  { title: "Collect tonight's t-shirts for washing", department: "counselors" },
];

const DEPARTMENTS = Object.keys(DEPARTMENT_LABELS) as Department[];

export function StartToday({ templates }: { templates: ChecklistTemplate[] }) {
  if (templates.length === 0) {
    return <TemplateSetup />;
  }
  return <StartButton templateId={templates[0].id} />;
}

function StartButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <Card className="space-y-2 text-center">
      <p className="text-sm text-muted">Nobody&apos;s started today&apos;s checklist yet.</p>
      <Button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await startTodayChecklist(templateId);
            if (result.error) setError(result.error);
            else router.refresh();
          })
        }
      >
        {isPending ? "Starting…" : "Start today"}
      </Button>
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}

function TemplateSetup() {
  const router = useRouter();
  const [name, setName] = useState("Daily Routine");
  const [items, setItems] = useState(SUGGESTED_ITEMS);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateItem(index: number, patch: Partial<{ title: string; department: Department }>) {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, i) => i !== index));
  }

  function addItem() {
    setItems((current) => [...current, { title: "", department: "support" }]);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await createTemplate({ name, items });
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <Card className="space-y-4">
      <div>
        <p className="font-medium">Set up your daily routine</p>
        <p className="mt-0.5 text-sm text-muted">
          This is the shape of every day — edit it once, then just tap &quot;Start today&quot; each
          morning.
        </p>
      </div>

      <Field label="Template name">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="space-y-1.5 rounded-xl border border-border p-2.5">
            <input
              className={inputClass}
              value={item.title}
              onChange={(e) => updateItem(index, { title: e.target.value })}
              placeholder="What needs to be done"
            />
            <div className="flex items-center justify-between gap-2">
              <Select
                small
                className="w-auto"
                value={item.department}
                onChange={(e) => updateItem(index, { department: e.target.value as Department })}
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {DEPARTMENT_LABELS[d]}
                  </option>
                ))}
              </Select>
              <button
                type="button"
                aria-label="Remove item"
                className="shrink-0 text-xs font-medium text-red-500 hover:opacity-80"
                onClick={() => removeItem(index)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="text-sm font-medium text-accent hover:opacity-80"
        onClick={addItem}
      >
        + Add item
      </button>

      <ErrorText>{error}</ErrorText>

      <Button disabled={isPending} onClick={handleSave}>
        {isPending ? "Saving…" : "Save template"}
      </Button>
    </Card>
  );
}
