export const DOCUMENT_FORM_TITLE_CLASS =
  "pointer-events-none m-0 shrink-0 self-center leading-none";

/** Heading for the purchase order and service proposal headers. */
export default function SimpleDocumentFormTitle({ children }) {
  const label = typeof children === "string" ? children : "";
  return (
    <span className="inline-flex max-w-[18rem] flex-col items-start gap-1.5" title={label || undefined}>
      <span className="truncate text-lg font-extrabold leading-none tracking-tight text-title">
        {children}
      </span>
      <span className="flex h-[3px] w-14 overflow-hidden rounded-full" aria-hidden>
        <span className="h-full w-9 bg-primary" />
        <span className="h-full flex-1 bg-primary/25" />
      </span>
    </span>
  );
}
