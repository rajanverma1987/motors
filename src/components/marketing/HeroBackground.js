/**
 * Soft shapes + light gradient for hero sections. Use inside a section with relative overflow-hidden.
 */
export default function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -right-32 -top-24 h-80 w-80 max-w-none rounded-full bg-primary/[0.06]" />
      <div className="absolute right-1/4 top-1/2 h-64 w-64 max-w-none rounded-full bg-primary/[0.04]" />
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-primary/[0.03] to-transparent" />
    </div>
  );
}
