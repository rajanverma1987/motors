"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/format-currency";

const CURRENCY = "USD";
const fmt = (v) => formatMoney(v, CURRENCY);

function partsLineTotal(row) {
  const qty = parseFloat(row?.qty ?? "1");
  const price = parseFloat(row?.price ?? "0");
  if (!Number.isFinite(qty) || !Number.isFinite(price)) return null;
  return Math.round(qty * price * 100) / 100;
}

function AttachmentLinks({ attachments, className = "" }) {
  if (!Array.isArray(attachments) || attachments.length === 0) return null;
  return (
    <div className={className}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2">Attachments</h3>
      <ul className="list-inside list-disc space-y-1 text-sm text-title">
        {attachments.map((a, i) => (
          <li key={`${a.url}-${i}`}>
            <a
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline hover:opacity-90"
            >
              {a.name || "Download"}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PhotoLinks({ urls, label }) {
  const list = (Array.isArray(urls) ? urls : []).map(String).filter(Boolean);
  if (list.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-secondary mb-1">{label}</p>
      <ul className="flex flex-wrap gap-2">
        {list.map((url, i) => (
          <li key={`${url}-${i}`}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-primary underline hover:opacity-90"
            >
              {label === "Motor photos" ? `Photo ${i + 1}` : `Image ${i + 1}`}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuoteDetailCard({ quote, printScope, outcomeLabel }) {
  const printId = `q-${quote.id}`;
  const hideWhenPrintingOther = printScope && printScope !== printId ? "print:hidden" : "";
  const hasScopeTable = Array.isArray(quote.scopeLines) && quote.scopeLines.length > 0;
  const hasParts = Array.isArray(quote.partsLines) && quote.partsLines.length > 0;

  return (
    <article
      className={`mb-6 rounded-lg border border-border bg-card p-4 shadow-sm last:mb-0 ${hideWhenPrintingOther}`}
      data-portal-print={printId}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
        <div>
          <h3 className="text-lg font-semibold text-title">
            {quote.rfqNumber ? `RFQ ${quote.rfqNumber}` : "Service proposal"}
          </h3>
          <p className="mt-1 text-sm text-secondary">
            {[quote.date && `Quote date: ${quote.date}`, quote.customerPo && `Your PO#: ${quote.customerPo}`]
              .filter(Boolean)
              .join(" · ") || null}
            {quote.estimatedCompletion ? (
              <span className="block mt-0.5">Estimated completion: {quote.estimatedCompletion}</span>
            ) : null}
          </p>
          {outcomeLabel ? (
            <p className="mt-2 text-sm font-medium text-title">Outcome: {outcomeLabel}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {quote.respondToken ? (
            <>
              <Link
                href={`/quote/respond/${encodeURIComponent(quote.respondToken)}`}
                className="inline-flex rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-title hover:bg-muted"
              >
                Full page
              </Link>
              <a
                href={`/quote/respond/${encodeURIComponent(quote.respondToken)}#print`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-title hover:bg-muted"
              >
                Print / PDF
              </a>
            </>
          ) : null}
        </div>
      </div>

      {quote.motorLabel ? (
        <section className="mb-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-1">Motor</h4>
          <p className="text-sm text-title">{quote.motorLabel}</p>
        </section>
      ) : null}

      {quote.repairScope?.trim() && !hasScopeTable ? (
        <section className="mb-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-1">Scope</h4>
          <p className="whitespace-pre-wrap text-sm text-title">{quote.repairScope}</p>
        </section>
      ) : null}

      {hasScopeTable ? (
        <section className="mb-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2">Scope & labor</h4>
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/80 border-b border-border">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-secondary">Description</th>
                  <th className="px-3 py-2 text-right font-medium text-secondary w-[7rem]">Price</th>
                </tr>
              </thead>
              <tbody>
                {quote.scopeLines.map((row, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2 align-top text-title whitespace-pre-wrap">{row.scope || "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-title">
                      {row.price ? fmt(row.price) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {hasParts ? (
        <section className="mb-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2">Other cost</h4>
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/80 border-b border-border">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-secondary">Item</th>
                  <th className="px-3 py-2 text-right font-medium text-secondary w-12">Qty</th>
                  <th className="px-3 py-2 text-left font-medium text-secondary w-14">UOM</th>
                  <th className="px-3 py-2 text-right font-medium text-secondary">Unit price</th>
                  <th className="px-3 py-2 text-right font-medium text-secondary">Line total</th>
                </tr>
              </thead>
              <tbody>
                {quote.partsLines.map((row, i) => {
                  const lt = partsLineTotal(row);
                  return (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2 text-title">{row.item || "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-title">{row.qty ?? "1"}</td>
                      <td className="px-3 py-2 text-title">{row.uom || "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-title">
                        {row.price ? fmt(row.price) : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-title">
                        {lt != null ? fmt(lt) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="mb-4 rounded border border-border bg-muted/30 p-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2">Amounts</h4>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-2 sm:block">
            <dt className="text-secondary">Scope total</dt>
            <dd className="font-medium text-right sm:text-left text-title">
              {quote.laborTotal ? fmt(quote.laborTotal) : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-2 sm:block">
            <dt className="text-secondary">Other cost total</dt>
            <dd className="font-medium text-right sm:text-left text-title">
              {quote.partsTotal ? fmt(quote.partsTotal) : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-2 sm:block">
            <dt className="text-secondary">Subtotal</dt>
            <dd className="font-medium text-right sm:text-left text-title">{fmt(quote.subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-2 sm:block">
            <dt className="text-secondary">Tax</dt>
            <dd className="font-medium text-right sm:text-left text-title">{fmt(quote.taxAmount)}</dd>
          </div>
          <div className="flex justify-between gap-2 border-t border-border pt-2 sm:col-span-2 sm:flex sm:justify-between">
            <dt className="font-semibold text-title">Grand total</dt>
            <dd className="font-semibold text-right text-title">{fmt(quote.grandTotal)}</dd>
          </div>
        </dl>
      </section>

      {quote.customerNotes?.trim() ? (
        <section className="mb-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-1">Notes from the shop</h4>
          <p className="whitespace-pre-wrap text-sm text-title">{quote.customerNotes}</p>
        </section>
      ) : null}

      <AttachmentLinks attachments={quote.attachments} />
    </article>
  );
}

function InvoiceDetailCard({ inv, printScope }) {
  const printId = `i-${inv.id}`;
  const hideWhenPrintingOther = printScope && printScope !== printId ? "print:hidden" : "";
  const hasScope = Array.isArray(inv.scopeLines) && inv.scopeLines.length > 0;
  const hasParts = Array.isArray(inv.partsLines) && inv.partsLines.length > 0;

  return (
    <article
      className={`mb-6 rounded-lg border border-border bg-card p-4 shadow-sm last:mb-0 ${hideWhenPrintingOther}`}
      data-portal-print={printId}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
        <div>
          <h3 className="text-lg font-semibold text-title">
            Invoice {inv.invoiceNumber || inv.rfqNumber || "—"}
          </h3>
          <p className="mt-1 text-sm text-secondary">
            {[inv.date && `Date: ${inv.date}`, inv.customerPo && `Your PO#: ${inv.customerPo}`]
              .filter(Boolean)
              .join(" · ")}
            {inv.estimatedCompletion ? (
              <span className="block mt-0.5">Est. completion: {inv.estimatedCompletion}</span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          {inv.viewToken ? (
            <>
              <Link
                href={`/invoice/view/${encodeURIComponent(inv.viewToken)}`}
                className="inline-flex rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-title hover:bg-muted"
              >
                Full page
              </Link>
              <a
                href={`/invoice/view/${encodeURIComponent(inv.viewToken)}#print`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-title hover:bg-muted"
              >
                Print / PDF
              </a>
            </>
          ) : (
            <span className="text-xs text-secondary">Print link unavailable — contact the shop.</span>
          )}
        </div>
      </div>

      {inv.motorLabel ? (
        <section className="mb-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-1">Motor</h4>
          <p className="text-sm text-title">{inv.motorLabel}</p>
        </section>
      ) : null}

      {hasScope ? (
        <section className="mb-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2">Scope</h4>
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/80 border-b border-border">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-secondary">Description</th>
                  <th className="px-3 py-2 text-right font-medium text-secondary w-[7rem]">Price</th>
                </tr>
              </thead>
              <tbody>
                {inv.scopeLines.map((row, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2 align-top text-title whitespace-pre-wrap">{row.scope || "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{row.price ? fmt(row.price) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {hasParts ? (
        <section className="mb-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2">Other cost</h4>
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/80 border-b border-border">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-secondary">Item</th>
                  <th className="px-3 py-2 text-right font-medium text-secondary w-12">Qty</th>
                  <th className="px-3 py-2 text-left font-medium text-secondary w-14">UOM</th>
                  <th className="px-3 py-2 text-right font-medium text-secondary">Unit</th>
                  <th className="px-3 py-2 text-right font-medium text-secondary">Total</th>
                </tr>
              </thead>
              <tbody>
                {inv.partsLines.map((row, i) => {
                  const lt = partsLineTotal(row);
                  return (
                    <tr key={i} className="border-t border-border">
                      <td className="px-3 py-2 text-title">{row.item || "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.qty ?? "1"}</td>
                      <td className="px-3 py-2 text-title">{row.uom || "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.price ? fmt(row.price) : "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{lt != null ? fmt(lt) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="mb-4 rounded border border-border bg-muted/30 p-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2">Totals & payments</h4>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-2 sm:block">
            <dt className="text-secondary">Scope total</dt>
            <dd className="tabular-nums text-right sm:text-left">{inv.laborTotal ? fmt(inv.laborTotal) : "—"}</dd>
          </div>
          <div className="flex justify-between gap-2 sm:block">
            <dt className="text-secondary">Other cost total</dt>
            <dd className="tabular-nums text-right sm:text-left">{inv.partsTotal ? fmt(inv.partsTotal) : "—"}</dd>
          </div>
          <div className="flex justify-between gap-2 sm:block">
            <dt className="text-secondary">Subtotal</dt>
            <dd className="tabular-nums text-right sm:text-left">{fmt(inv.subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-2 sm:block">
            <dt className="text-secondary">Tax</dt>
            <dd className="tabular-nums text-right sm:text-left">{fmt(inv.taxAmount)}</dd>
          </div>
          <div className="flex justify-between gap-2 border-t border-border pt-2 sm:col-span-2">
            <dt className="font-semibold text-title">Grand total</dt>
            <dd className="font-semibold text-right tabular-nums">{fmt(inv.grandTotal)}</dd>
          </div>
          <div className="flex justify-between gap-2 sm:block">
            <dt className="text-secondary">Recorded payments</dt>
            <dd className="tabular-nums text-right sm:text-left">{fmt(inv.totalPaid)}</dd>
          </div>
          <div className="flex justify-between gap-2 sm:block">
            <dt className="text-secondary">Balance due</dt>
            <dd className="font-medium text-right sm:text-left tabular-nums">{fmt(inv.balanceDue)}</dd>
          </div>
        </dl>
        {Array.isArray(inv.payments) && inv.payments.length > 0 ? (
          <ul className="mt-3 space-y-1 border-t border-border pt-3 text-xs text-secondary">
            {inv.payments.map((p, i) => (
              <li key={i} className="tabular-nums">
                {p.paymentDate || "—"} — {fmt(p.amount)}
                {p.method ? ` · ${p.method}` : ""}
                {p.reference ? ` · Ref. ${p.reference}` : ""}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {inv.customerNotes?.trim() ? (
        <section>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-secondary mb-1">Notes</h4>
          <p className="whitespace-pre-wrap text-sm text-title">{inv.customerNotes}</p>
        </section>
      ) : null}
    </article>
  );
}

export default function PortalCustomerContent({ data }) {
  const { customer, motors = [], repairsInProgress = [], repairHistory = [], invoices = [] } = data;
  const [printScope, setPrintScope] = useState(null);

  const clearPrint = useCallback(() => setPrintScope(null), []);

  useEffect(() => {
    window.addEventListener("afterprint", clearPrint);
    return () => window.removeEventListener("afterprint", clearPrint);
  }, [clearPrint]);

  const startPrint = (id) => {
    setPrintScope(id);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.print());
    });
  };

  const shellPrintHide = printScope ? "print:hidden" : "";

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-[67.2rem] px-4 py-8">
        <header className={`mb-8 border-b border-border pb-6 ${shellPrintHide}`}>
          <h1 className="text-2xl font-bold text-title">Motor repair portal</h1>
          <p className="mt-1 text-secondary">
            Welcome, {customer.name || customer.companyName || "Customer"}
          </p>
        </header>

        <section className={`mb-10 ${printScope ? "print:hidden" : ""}`}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary mb-3">Your motors</h2>
          {motors.length === 0 ? (
            <p className="text-sm text-secondary">No motors on file yet.</p>
          ) : (
            <div className="space-y-4">
              {motors.map((m) => (
                <div key={m.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
                  <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <dt className="text-xs font-medium text-secondary">Serial</dt>
                      <dd className="text-title font-medium">{m.serialNumber || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-secondary">Manufacturer / model</dt>
                      <dd className="text-title">
                        {[m.manufacturer, m.model].filter(Boolean).join(" ") || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-secondary">HP / RPM</dt>
                      <dd className="text-title">
                        {[m.hp && `${m.hp} HP`, m.rpm && `${m.rpm} RPM`].filter(Boolean).join(" · ") || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-secondary">Voltage</dt>
                      <dd className="text-title">{m.voltage || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-secondary">Frame / type</dt>
                      <dd className="text-title">
                        {[m.frameSize, m.motorType].filter(Boolean).join(" · ") || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-secondary">kW / Amps</dt>
                      <dd className="text-title">
                        {[m.kw && `${m.kw} kW`, m.amps && `${m.amps} A`].filter(Boolean).join(" · ") || "—"}
                      </dd>
                    </div>
                  </dl>
                  {m.notes?.trim() ? (
                    <div className="mt-3 border-t border-border pt-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-secondary mb-1">Notes</p>
                      <p className="whitespace-pre-wrap text-sm text-title">{m.notes}</p>
                    </div>
                  ) : null}
                  <PhotoLinks urls={m.motorPhotos} label="Motor photos" />
                  <PhotoLinks urls={m.nameplateImages} label="Nameplate images" />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mb-10">
          <div className={shellPrintHide}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary mb-1">Active repairs</h2>
            <p className="mb-3 text-sm text-secondary">
              Proposals and amounts for work in progress. Use <strong>Print / PDF</strong> for a clean copy, or print this
              page from your browser.
            </p>
          </div>
          {repairsInProgress.length === 0 ? (
            <p className={`text-sm text-secondary ${printScope ? "print:hidden" : ""}`}>No repairs in progress.</p>
          ) : (
            <>
              {repairsInProgress.map((q) => (
                <div key={q.id} className="relative">
                  <QuoteDetailCard quote={q} printScope={printScope} />
                  <div className="mb-2 flex justify-end print:hidden">
                    <button
                      type="button"
                      onClick={() => startPrint(`q-${q.id}`)}
                      className="text-xs font-medium text-primary underline hover:opacity-90"
                    >
                      Print this proposal only
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </section>

        <section className="mb-10">
          <div className={shellPrintHide}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary mb-1">Repair history</h2>
            <p className="mb-3 text-sm text-secondary">Past proposals with outcomes and amounts.</p>
          </div>
          {repairHistory.length === 0 ? (
            <p className={`text-sm text-secondary ${printScope ? "print:hidden" : ""}`}>
              No completed or closed repairs on file.
            </p>
          ) : (
            repairHistory.map((q) => (
              <div key={q.id} className="relative">
                <QuoteDetailCard quote={q} printScope={printScope} outcomeLabel={q.outcomeLabel} />
                <div className="mb-2 flex justify-end print:hidden">
                  <button
                    type="button"
                    onClick={() => startPrint(`q-${q.id}`)}
                    className="text-xs font-medium text-primary underline hover:opacity-90"
                  >
                    Print this proposal only
                  </button>
                </div>
              </div>
            ))
          )}
        </section>

        <section className={`mb-10 ${printScope ? "print:hidden" : ""}`}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary mb-3">Test reports</h2>
          <p className="text-sm text-secondary">
            Test reports and extra files from your shop appear as <strong>Attachments</strong> under each proposal
            above when provided.
          </p>
        </section>

        <section>
          <div className={shellPrintHide}>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary mb-1">Invoices</h2>
            <p className="mb-3 text-sm text-secondary">
              Line items, totals, and payments. Open <strong>Full page</strong> for the printable layout, or use{" "}
              <strong>Print / PDF</strong>.
            </p>
          </div>
          {invoices.length === 0 ? (
            <p className={`text-sm text-secondary ${printScope ? "print:hidden" : ""}`}>No invoices on file yet.</p>
          ) : (
            invoices.map((inv) => (
              <div key={inv.id} className="relative">
                <InvoiceDetailCard inv={inv} printScope={printScope} />
                <div className="mb-2 flex justify-end print:hidden">
                  <button
                    type="button"
                    onClick={() => startPrint(`i-${inv.id}`)}
                    className="text-xs font-medium text-primary underline hover:opacity-90"
                  >
                    Print this invoice only
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
