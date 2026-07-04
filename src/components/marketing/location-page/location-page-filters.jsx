import Link from "next/link";

/**
 * @param {{ slug: string, insights: object, activeMatch?: string, activeCapability?: string }} props
 */
export default function LocationPageFilters({ slug, insights, activeMatch = "", activeCapability = "" }) {
  const base = `/motor-repair-shop/${slug}`;

  function href(match, capability) {
    const params = new URLSearchParams();
    if (match) params.set("match", match);
    if (capability) params.set("capability", capability);
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }

  const matchFilters = [
    { key: "", label: "All shops", count: insights.total },
    { key: "based-in", label: "Based in area", count: insights.basedIn },
    { key: "serves", label: "Serves area", count: insights.serves },
  ];

  const capabilityFilters = [
    { key: "", label: "Any capability" },
    { key: "rewinding", label: "Rewinding", count: insights.rewinding },
    { key: "pickup", label: "Pickup / delivery", count: insights.pickup },
    { key: "rush", label: "Rush repair", count: insights.rush },
  ];

  function pillClass(active) {
    return active
      ? "border-primary bg-primary/10 text-primary"
      : "border-border bg-card text-secondary hover:border-primary/40 hover:text-title";
  }

  return (
    <div className="not-prose mb-6 space-y-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Location</p>
        <div className="flex flex-wrap gap-2">
          {matchFilters.map((f) => {
            const active = (activeMatch || "") === f.key;
            if (f.key && f.count === 0) return null;
            return (
              <Link
                key={f.key || "all"}
                href={href(f.key, activeCapability)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${pillClass(active)}`}
              >
                {f.label}
                {typeof f.count === "number" ? (
                  <span className="text-xs opacity-80">({f.count})</span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Capabilities</p>
        <div className="flex flex-wrap gap-2">
          {capabilityFilters.map((f) => {
            const active = (activeCapability || "") === f.key;
            if (f.key && f.count === 0) return null;
            return (
              <Link
                key={f.key || "any"}
                href={href(activeMatch, f.key)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${pillClass(active)}`}
              >
                {f.label}
                {typeof f.count === "number" ? (
                  <span className="text-xs opacity-80">({f.count})</span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
