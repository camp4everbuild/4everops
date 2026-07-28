"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Modal } from "@/components/modal";
import { NewTaskForm } from "./new-task-form";
import type { Profile } from "@/lib/types";

export function NewTaskToggle({
  currentUserId,
  assignableProfiles,
  taskCounts,
}: {
  currentUserId: string;
  assignableProfiles: Profile[];
  taskCounts: Record<string, number>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={assignableProfiles.length === 0}>
        New task
      </Button>
      {open ? (
        <Modal title="New task" onClose={() => setOpen(false)}>
          {(requestClose) => (
            <NewTaskForm
              currentUserId={currentUserId}
              assignableProfiles={assignableProfiles}
              taskCounts={taskCounts}
              onDone={requestClose}
            />
          )}
        </Modal>
      ) : null}
    </>
  );
}
