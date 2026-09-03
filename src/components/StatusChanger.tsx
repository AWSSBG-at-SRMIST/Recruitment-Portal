"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/types";

export function StatusChanger({
  applicationId,
  current,
}: {
  applicationId: string;
  current: ApplicationStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<ApplicationStatus>(current);
  const [saving, setSaving] = useState(false);

  async function change(next: string) {
    const value = next as ApplicationStatus;
    setStatus(value);
    setSaving(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: value }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setStatus(current); // revert on failure
    } finally {
      setSaving(false);
    }
  }

  return (
    <Select value={status} onValueChange={change} disabled={saving}>
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {APPLICATION_STATUSES.map((s) => (
          // Shortlisting is closed — nobody can move a new candidate into
          // SHORTLISTED, but someone already shortlisted can still show
          // (and move on from) that value.
          <SelectItem key={s} value={s} disabled={s === "SHORTLISTED" && current !== "SHORTLISTED"}>
            {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
