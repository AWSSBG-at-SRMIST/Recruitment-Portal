import type { VerdictLabel } from "@/types";
import { verdictColor } from "@/lib/scoring/verdict";

// Match-score gauge: big number + progress bar + verdict label, mirroring
// Hiresense's "60/100 · Maybe" card.
export function ScoreGauge({ score, verdict }: { score: number | null; verdict?: VerdictLabel }) {
  const pct = score ?? 0;
  const barColor =
    pct >= 78 ? "#34d399" : pct >= 62 ? "#D946EF" : pct >= 45 ? "#fbbf24" : "#f87171";

  return (
    <div>
      <div className="flex items-baseline gap-1">
        <span className="text-5xl font-bold tabular-nums text-on-surface">{score ?? "—"}</span>
        <span className="text-lg text-on-surface-variant">/100</span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-container">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: barColor }} />
      </div>
      {verdict && (
        <p className={`mt-3 text-sm font-semibold uppercase tracking-wide ${verdictColor(verdict)}`}>
          {verdict}
        </p>
      )}
    </div>
  );
}
