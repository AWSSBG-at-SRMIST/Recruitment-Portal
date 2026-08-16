import type { CompetencyScore } from "@/types";

// Lightweight hand-rolled SVG radar — no charting dependency. Renders a
// competency polygon over N labelled axes (0-100 each), in the brand violet.

export function RadarChart({ data, size = 260 }: { data: CompetencyScore[]; size?: number }) {
  const axes = data.length;
  if (axes < 3) return null;

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 46; // leave room for labels
  const rings = [0.25, 0.5, 0.75, 1];

  // Angle for axis i, starting at top (−90°) going clockwise.
  const angle = (i: number) => (Math.PI * 2 * i) / axes - Math.PI / 2;
  const point = (i: number, r: number) => ({
    x: cx + Math.cos(angle(i)) * radius * r,
    y: cy + Math.sin(angle(i)) * radius * r,
  });

  const valuePoints = data
    .map((d, i) => {
      const p = point(i, Math.max(0, Math.min(100, d.score)) / 100);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[280px]" role="img" aria-label="Competency radar">
      {/* rings */}
      {rings.map((r) => (
        <polygon
          key={r}
          points={Array.from({ length: axes }, (_, i) => {
            const p = point(i, r);
            return `${p.x},${p.y}`;
          }).join(" ")}
          fill="none"
          stroke="currentColor"
          className="text-border"
          strokeWidth={1}
        />
      ))}
      {/* spokes */}
      {data.map((_, i) => {
        const p = point(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="currentColor" className="text-border" strokeWidth={1} />;
      })}
      {/* value polygon */}
      <polygon points={valuePoints} fill="rgba(168,85,247,0.25)" stroke="#A855F7" strokeWidth={2} />
      {data.map((d, i) => {
        const p = point(i, Math.max(0, Math.min(100, d.score)) / 100);
        return <circle key={i} cx={p.x} cy={p.y} r={3} fill="#D946EF" />;
      })}
      {/* labels */}
      {data.map((d, i) => {
        const p = point(i, 1.16);
        const a = angle(i);
        const anchor = Math.abs(Math.cos(a)) < 0.3 ? "middle" : Math.cos(a) > 0 ? "start" : "end";
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            textAnchor={anchor}
            dominantBaseline="middle"
            className="fill-on-surface-variant"
            fontSize={9}
          >
            {d.axis}
          </text>
        );
      })}
    </svg>
  );
}
