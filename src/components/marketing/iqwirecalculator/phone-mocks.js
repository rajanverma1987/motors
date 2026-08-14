function PhoneShell({ children, caption }) {
  return (
    <figure className="mx-auto w-full max-w-[280px]">
      <div className="overflow-hidden rounded-[1.75rem] border border-border bg-[hsl(32,22%,99%)] shadow-sm dark:shadow-black/20">
        <div className="flex items-center justify-between border-b border-border bg-[hsl(30,18%,98%)] px-4 py-2.5">
          <span className="text-[11px] font-semibold text-title">CM Best Match</span>
          <span className="text-[10px] font-medium text-primary">Done</span>
        </div>
        <div className="min-h-[280px] p-3">{children}</div>
      </div>
      {caption ? <figcaption className="mt-2 text-center text-xs text-secondary">{caption}</figcaption> : null}
    </figure>
  );
}

function Card({ children, tone = "neutral" }) {
  const bg =
    tone === "good"
      ? "bg-emerald-500/15 dark:bg-emerald-500/20"
      : tone === "mid"
        ? "bg-amber-400/25 dark:bg-amber-500/15"
        : "bg-muted/20 dark:bg-muted/10";
  return <div className={`mb-2 rounded-lg border border-border p-2.5 last:mb-0 ${bg}`}>{children}</div>;
}

export function ResultsPhoneMock() {
  return (
    <PhoneShell caption="Ranked mixes: green within ~2%, yellow within ~10%.">
      <p className="mb-2 text-[10px] text-secondary">Target 12,360 CM · min 3 / max 10</p>
      <Card tone="good">
        <p className="text-[12px] font-bold leading-snug text-title">Total CM 12,432 · +0.58% · 72 CM Δ</p>
        <p className="mt-1 text-[12px] text-text">Wires Combination : 8#18 &nbsp;|&nbsp; 2#20</p>
        <p className="mt-0.5 text-[11px] text-secondary">Wires in hand: 10</p>
      </Card>
      <Card tone="mid">
        <p className="text-[12px] font-bold leading-snug text-title">Total CM 13,192 · +6.73% · 832 CM Δ</p>
        <p className="mt-1 text-[12px] text-text">Wires Combination : 6#16 &nbsp;|&nbsp; 4#18</p>
        <p className="mt-0.5 text-[11px] text-secondary">Wires in hand: 10</p>
      </Card>
    </PhoneShell>
  );
}

export function CatalogPhoneMock() {
  return (
    <PhoneShell caption="Built-in AWG plus the extra sizes you stock.">
      <p className="mb-2 text-[10px] font-semibold text-title">Wire catalog</p>
      {[
        ["18", "1,624 CM"],
        ["17", "2,048 CM"],
        ["16", "2,583 CM"],
        ["18.5", "custom"],
      ].map(([size, cm], i) => (
        <div key={size} className="flex items-center gap-2 border-b border-border py-2 last:border-b-0">
          <span
            className={`h-4 w-4 shrink-0 rounded border ${i < 3 ? "border-primary bg-primary/20" : "border-border"}`}
            aria-hidden
          />
          <span className="flex-1 text-[13px] font-semibold text-title">{size}</span>
          <span className="text-[12px] text-secondary">{cm}</span>
        </div>
      ))}
    </PhoneShell>
  );
}

export function InputsPhoneMock() {
  return (
    <PhoneShell caption="Takeoff notes plus the CM target that drives the search.">
      <div className="grid grid-cols-2 gap-2">
        {[
          ["Orig. wires in hand", "10"],
          ["Orig. wire size", "19"],
          ["Original CM", "12360"],
          ["Targeted CM", "12360"],
          ["Min. wires", "3"],
          ["Max wires", "10"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-border bg-muted/10 px-2 py-1.5">
            <p className="text-[9px] font-semibold text-secondary">{label}</p>
            <p className="text-[13px] font-semibold tabular-nums text-title">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-md bg-primary py-2.5 text-center text-[12px] font-bold text-white">
        Calculate Best Match
      </div>
    </PhoneShell>
  );
}

export function SharePhoneMock() {
  return (
    <PhoneShell caption="Print a landscape PDF or email it onto the traveler.">
      <div className="mb-2 flex gap-2">
        <div className="flex-1 rounded-md border border-primary py-2 text-center text-[12px] font-bold text-primary">
          Print
        </div>
        <div className="flex-1 rounded-md border border-primary py-2 text-center text-[12px] font-bold text-primary">
          Email
        </div>
      </div>
      <Card>
        <p className="text-[11px] font-semibold text-title">Save this calculation</p>
        <p className="mt-1 text-[11px] text-secondary">Name it, reopen later from Saved results.</p>
      </Card>
      <p className="mt-2 text-[10px] leading-relaxed text-secondary">
        IQWireCalculator · landscape PDF with original takeoff, target CM, and the full mix table.
      </p>
    </PhoneShell>
  );
}
