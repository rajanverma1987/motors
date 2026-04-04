"use client";

import CompanyAccountsPrint from "@/components/dashboard/company-accounts-print";
import { accountsPaymentTermsLabel } from "@/lib/accounts-display";

export const STAGE_LABEL = {
  preliminary: "Pre-disassembly Quote",
  final: "Quote",
};

function printDocumentTitle(quotes) {
  const list = Array.isArray(quotes) ? quotes : [];
  if (list.length === 0) return "Quotes";
  const stages = new Set(list.map((q) => q.stage).filter(Boolean));
  if (stages.size === 1) {
    const s = list[0].stage;
    return STAGE_LABEL[s] || "Quote";
  }
  return "Quotes";
}

export function lineTotal(qty, unitPrice) {
  const q = Number(qty);
  const p = Number(unitPrice);
  if (!Number.isFinite(q) || !Number.isFinite(p)) return null;
  return q * p;
}

function parseMoneyNum(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

/** Numeric subtotal for one quote — must match the "Subtotal" line shown in each section above. */
export function quotePrintSubtotal(q) {
  if (!q) return 0;
  if (q.source === "crm") {
    if (q.subtotal != null && q.subtotal !== "") return parseMoneyNum(q.subtotal);
    return parseMoneyNum(q.laborTotal) + parseMoneyNum(q.partsTotal);
  }
  if (q.subtotal != null && q.subtotal !== "") return parseMoneyNum(q.subtotal);
  return 0;
}

/**
 * Printable body for repair-flow flow quotes (job + quotes from API).
 * @param {object} props
 * @param {object} props.job
 * @param {object[]} props.quotes
 * @param {(n: number|string) => string} props.fmt
 * @param {object} [props.accountSettings]
 */
export default function RepairFlowFlowQuotePrintContent({ job, quotes, fmt, accountSettings }) {
  const paymentTermsLabel = accountsPaymentTermsLabel(accountSettings?.accountsPaymentTerms);
  const list = Array.isArray(quotes) ? quotes : [];
  const grandTotal = list.reduce((sum, q) => sum + quotePrintSubtotal(q), 0);

  return (
    <>
      <div className="mb-6 border-b border-border pb-4">
        <CompanyAccountsPrint
          billingAddress={accountSettings?.accountsBillingAddress}
          paymentTermsLabel={paymentTermsLabel}
        />
      </div>

      <div className="mb-6 border-b border-border pb-4">
        <h1 className="text-2xl font-bold">{printDocumentTitle(quotes)}</h1>
        <p className="mt-2 font-medium">
          {job.jobNumber || job.id}
          {job.customerLabel ? ` · ${job.customerLabel}` : ""}
        </p>
        <p className="text-secondary">{job.motorLabel || "—"}</p>
      </div>

      {list.map((q) => (
        <section key={q.id} className="mb-8 border-b border-border pb-6 last:mb-0 last:border-b-0 last:pb-0">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-secondary">
            {q.source === "crm" && q.rfqNumber
              ? `${STAGE_LABEL[q.stage] || "Quote"} · RFQ ${q.rfqNumber}`
              : STAGE_LABEL[q.stage] || q.stage || "Quote"}
          </h2>
          <p className="mt-1 text-sm text-secondary">
            Status: {q.status || "—"}
            {q.createdAt ? ` · ${new Date(q.createdAt).toLocaleString()}` : ""}
          </p>

          {q.source === "crm" ? (
            <>
              {(q.scopeLines || []).filter((r) => String(r?.scope || "").trim()).length > 0 ? (
                <div className="mt-4">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Scope</h3>
                  <table className="w-full overflow-hidden rounded-lg border border-border">
                    <thead className="bg-card">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Description</th>
                        <th className="px-3 py-2 text-right font-medium">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(q.scopeLines || [])
                        .filter((r) => String(r?.scope || "").trim())
                        .map((row, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="px-3 py-2 align-top whitespace-pre-wrap">{row.scope || "—"}</td>
                            <td className="px-3 py-2 text-right align-top tabular-nums">
                              {row.price != null && row.price !== "" ? fmt(parseMoneyNum(row.price)) : "—"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  <p className="mt-2 text-right text-sm">
                    Scope total: {fmt(parseMoneyNum(q.laborTotal))}
                  </p>
                </div>
              ) : null}
              {(q.partsLines || []).some((r) => String(r?.item || "").trim()) ? (
                <div className="mt-4">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Other cost</h3>
                  <table className="w-full overflow-hidden rounded-lg border border-border text-sm">
                    <thead className="bg-card">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Item</th>
                        <th className="px-3 py-2 text-right font-medium">Qty</th>
                        <th className="px-3 py-2 text-left font-medium">UOM</th>
                        <th className="px-3 py-2 text-right font-medium">Unit</th>
                        <th className="px-3 py-2 text-right font-medium">Line</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(q.partsLines || [])
                        .filter((r) => String(r?.item || "").trim())
                        .map((row, i) => {
                          const lt = lineTotal(row.qty, row.price);
                          return (
                            <tr key={i} className="border-t border-border">
                              <td className="px-3 py-2">{row.item || "—"}</td>
                              <td className="px-3 py-2 text-right tabular-nums">{row.qty ?? "—"}</td>
                              <td className="px-3 py-2">{row.uom || "—"}</td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {row.price != null && row.price !== "" ? fmt(parseMoneyNum(row.price)) : "—"}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {lt != null ? fmt(lt) : "—"}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                  <p className="mt-2 text-right text-sm">
                    Other cost total: {fmt(parseMoneyNum(q.partsTotal))}
                  </p>
                </div>
              ) : null}
              <p className="mt-3 text-right font-semibold">
                Subtotal: {fmt(q.subtotal != null ? q.subtotal : parseMoneyNum(q.laborTotal) + parseMoneyNum(q.partsTotal))}
              </p>
            </>
          ) : (
            <>
              <table className="mt-4 w-full overflow-hidden rounded-lg border border-border">
                <thead className="bg-card">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Description</th>
                    <th className="px-3 py-2 text-right font-medium">Qty</th>
                    <th className="px-3 py-2 text-right font-medium">Unit</th>
                    <th className="px-3 py-2 text-right font-medium">Line</th>
                  </tr>
                </thead>
                <tbody>
                  {(q.lineItems || []).map((li, i) => {
                    const lt = lineTotal(li.quantity, li.unitPrice);
                    return (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-2 align-top">
                          {li.description || "—"}
                          {li.subjectToTeardown ? (
                            <span className="block text-xs text-secondary">(Subject to disassembly)</span>
                          ) : null}
                          {li.notes ? (
                            <span className="mt-1 block text-xs text-secondary whitespace-pre-wrap">{li.notes}</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-right align-top">{li.quantity ?? "—"}</td>
                        <td className="px-3 py-2 text-right align-top">{fmt(li.unitPrice ?? 0)}</td>
                        <td className="px-3 py-2 text-right align-top">{lt != null ? fmt(lt) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <p className="mt-3 text-right font-semibold">Subtotal: {fmt(q.subtotal != null ? q.subtotal : 0)}</p>
            </>
          )}

          {q.quoteNotes ? (
            <div className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-secondary">Notes</h3>
              <p className="mt-1 whitespace-pre-wrap">{q.quoteNotes}</p>
            </div>
          ) : null}
          {q.source === "crm" && q.customerNotes?.trim() ? (
            <div className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-secondary">Customer notes</h3>
              <p className="mt-1 whitespace-pre-wrap">{q.customerNotes}</p>
            </div>
          ) : null}
        </section>
      ))}

      {list.length > 1 ? (
        <div className="mt-6 border-t-2 border-border pt-4 print:mt-4 print:pt-3">
          <p className="text-right text-base font-bold tabular-nums">Grand total (all quotes): {fmt(grandTotal)}</p>
        </div>
      ) : null}
    </>
  );
}
