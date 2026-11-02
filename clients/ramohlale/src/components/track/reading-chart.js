"use client";

/**
 * §6.8 - insulation resistance and vibration readings over time.
 * A small inline SVG keeps the PWA bundle light on phones.
 */
export default function TrackReadingChart({ title, unit, points }) {
  const rows = Array.isArray(points) ? points : [];
  if (rows.length < 2) return null;

  const width = 280;
  const height = 72;
  const padX = 6;
  const padY = 8;
  const values = rows.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const coords = rows.map((point, index) => {
    const x = padX + (index * (width - padX * 2)) / (rows.length - 1);
    const y = height - padY - ((point.value - min) / span) * (height - padY * 2);
    return { ...point, x, y };
  });
  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-secondary">{title}</p>
        <p className="text-[11px] text-secondary">
          {rows[rows.length - 1].value} {unit}
        </p>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="mt-1 w-full"
        role="img"
        aria-label={`${title} trend, latest ${rows[rows.length - 1].value} ${unit}`}
      >
        <path d={path} fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" />
        {coords.map((c) => (
          <circle key={`${c.label}-${c.x}`} cx={c.x} cy={c.y} r="2.5" className="fill-primary" />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-secondary">
        <span>{rows[0].label}</span>
        <span>{rows[rows.length - 1].label}</span>
      </div>
    </div>
  );
}
