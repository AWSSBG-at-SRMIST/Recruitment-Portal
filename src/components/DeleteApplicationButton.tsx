"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DeleteApplicationButton({
  applicationId,
  className,
}: {
  applicationId: string;
  className?: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.push("/applications");
      router.refresh();
    } catch {
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      onBlur={() => setConfirming(false)}
      disabled={deleting}
      className={className}
    >
      <Trash2 className="h-4 w-4 shrink-0" />
      <span className="truncate">{deleting ? "Deleting…" : confirming ? "Confirm delete?" : "Delete"}</span>
    </Button>
  );
}
