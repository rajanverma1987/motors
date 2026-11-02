/**
 * @param {{ insights: object }} props
 */
export default function LocationPageInsights({ insights }) {
  if (!insights?.total) return null;

  const tiles = [
    { label: "Listed centers", value: insights.total },
    { label: "Based in area", value: insights.basedIn },
    { label: "Serve this area", value: insights.serves },
    { label: "Rewinding listed", value: insights.rewinding },
    { label: "Pickup / delivery", value: insights.pickup },
    { label: "Rush available", value: insights.rush },
  ].filter((t) => t.value > 0 || t.label === "Listed centers");

  return (
    <div className="not-prose mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((tile) => (
        <div
          key={tile.label}
          className="rounded-lg border border-border bg-card/80 px-3 py-3 text-center sm:px-4"
        >
          <p className="text-2xl font-bold tabular-nums text-title">{tile.value}</p>
          <p className="mt-1 text-[11px] leading-snug text-secondary sm:text-xs">{tile.label}</p>
        </div>
      ))}
    </div>
  );
}
