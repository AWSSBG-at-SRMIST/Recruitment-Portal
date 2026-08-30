import { Badge } from "@/components/ui/badge";
import type { ApplicationStatus } from "@/types";

const STATUS_VARIANT: Record<ApplicationStatus, React.ComponentProps<typeof Badge>["variant"]> = {
  APPLIED: "secondary",
  INTERVIEW: "warning",
  SELECTED: "success",
  REJECTED: "destructive",
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{status}</Badge>;
}

export function ScorePill({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-on-surface-variant">—</span>;
  const color =
    score >= 75 ? "text-emerald-400" : score >= 55 ? "text-primary" : "text-amber-400";
  return <span className={`font-bold tabular-nums ${color}`}>{score}</span>;
}
