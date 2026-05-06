/** Shown while directory listing query runs (inside Suspense). */
export default function ListingsDirectoryResultsSkeleton() {
  return (
    <section className="py-10 sm:py-14" aria-busy="true" aria-label="Loading repair center listings">
      <span className="sr-only">Loading repair center listings</span>
      <div className="mx-auto max-w-[86.4rem] px-4 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="h-11 min-h-[2.75rem] w-full max-w-[50.4rem] animate-pulse rounded-md bg-muted/70" />
          <div className="h-5 w-44 shrink-0 animate-pulse rounded-md bg-muted/50 sm:ml-auto" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={`sk-${i}`}
              className="flex min-h-[8rem] gap-4 rounded-xl border border-border bg-card p-4 sm:p-5"
              aria-hidden
            >
              <div className="h-14 w-14 shrink-0 animate-pulse rounded-lg bg-muted/60 sm:h-16 sm:w-16" />
              <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                <div className="h-5 w-[82%] animate-pulse rounded-md bg-muted/75" />
                <div className="h-4 w-[48%] animate-pulse rounded-md bg-muted/55" />
                <div className="h-12 w-full animate-pulse rounded-md bg-muted/35" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
