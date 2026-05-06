/** Shared full-width loader for directory / location listing RSC navigations (see route loading.js). */
export default function ListingRouteLoadingShell({ message }) {
  return (
    <div
      className="mx-auto max-w-[86.4rem] px-4 py-16 sm:px-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{message}</span>
      <div className="flex flex-col items-center justify-center gap-6 py-16 sm:py-24">
        <div
          className="inline-block h-10 w-10 shrink-0 animate-spin rounded-full border-2 border-border border-t-primary"
          aria-hidden
        />
        <p className="text-center text-sm font-medium text-title">{message}</p>
        <div className="w-full max-w-md space-y-3" aria-hidden>
          <div className="h-3 w-full animate-pulse rounded-md bg-muted/80" />
          <div className="h-3 w-[94%] animate-pulse rounded-md bg-muted/60" />
          <div className="h-3 w-[72%] animate-pulse rounded-md bg-muted/45" />
        </div>
      </div>
    </div>
  );
}
