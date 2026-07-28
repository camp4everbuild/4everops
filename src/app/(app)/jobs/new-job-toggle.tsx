"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Modal } from "@/components/modal";
import { NewJobForm } from "./new-job-form";

export function NewJobToggle() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>Post job</Button>
      {open ? (
        <Modal title="Post job" onClose={() => setOpen(false)}>
          {(requestClose) => <NewJobForm onDone={requestClose} />}
        </Modal>
      ) : null}
    </>
  );
}
