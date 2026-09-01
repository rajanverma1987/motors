"use client";

import { useCallback, useMemo, useState } from "react";
import { FiBriefcase, FiClipboard, FiFileText, FiPrinter, FiTool } from "react-icons/fi";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import Tabs from "@/components/ui/tabs";
import DocumentPrintOffscreenPortal from "@/components/dashboard/document-print-offscreen-portal";
import QuotePrintSheetBody from "@/components/dashboard/quote-print-sheet-body";
import InvoicePrintPreview from "@/components/dashboard/invoice-print-preview";
import { formatMoney } from "@/lib/format-currency";
import { formatDateForCurrency } from "@/lib/format-date";

function fmtMoney(value, currency) {
  return formatMoney(value, currency || "USD");
}

function fmtDate(value, currency) {
  if (!value) return "";
  const formatted = formatDateForCurrency(value, currency || "USD");
  return formatted === ", " ? "" : formatted;
}

function statusBadgeVariant(status) {
  const s = String(status || "").toLowerCase();
  if (!s) return "default";
  if (/\b(paid|approved|accepted|won|complete|completed|closed|delivered)\b/.test(s)) return "success";
  if (/\b(rejected|lost|cancelled|canceled|void|declined)\b/.test(s)) return "danger";
  if (/\b(partial|pending|submitted|progress|quoted|contacted)\b/.test(s)) return "warning";
  return "primary";
}

function AttachmentLinks({ attachments }) {
  if (!Array.isArray(attachments) || attachments.length === 0) return null;
  return (
    <div className="mt-3">
      <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-secondary">
        Attachments
      </h4>
      <ul className="space-y-1 text-sm text-title">
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

function LineTables({ doc, currency }) {
  const hasScope = Array.isArray(doc.scopeLines) && doc.scopeLines.length > 0;
  const hasOther = Array.isArray(doc.otherLines) && doc.otherLines.length > 0;

  return (
    <>
      {hasScope ? (
        <section className="mb-3">
          <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-secondary">
            Scope details
          </h4>
          <div className="overflow-x-auto border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-primary/[0.04]">
                <tr>
                  <th className="px-2.5 py-1.5 text-left text-xs font-medium text-secondary">
                    Description
                  </th>
                  <th className="w-28 px-2.5 py-1.5 text-right text-xs font-medium text-secondary">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody>
                {doc.scopeLines.map((row, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="whitespace-pre-wrap px-2.5 py-1.5 align-top text-title">
                      {row.description || ", "}
                    </td>
                    <td className="px-2.5 py-1.5 text-right tabular-nums text-title">
                      {row.price ? fmtMoney(row.price, currency) : ", "}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {hasOther ? (
        <section className="mb-3">
          <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-secondary">
            Other items
          </h4>
          <div className="overflow-x-auto border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-primary/[0.04]">
                <tr>
                  <th className="px-2.5 py-1.5 text-left text-xs font-medium text-secondary">Item</th>
                  <th className="w-12 px-2.5 py-1.5 text-right text-xs font-medium text-secondary">
                    Qty
                  </th>
                  <th className="w-14 px-2.5 py-1.5 text-left text-xs font-medium text-secondary">
                    UOM
                  </th>
                  <th className="px-2.5 py-1.5 text-right text-xs font-medium text-secondary">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody>
                {doc.otherLines.map((row, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-2.5 py-1.5 text-title">{row.description || ", "}</td>
                    <td className="px-2.5 py-1.5 text-right tabular-nums text-title">
                      {row.qty || "1"}
                    </td>
                    <td className="px-2.5 py-1.5 text-title">{row.uom || ", "}</td>
                    <td className="px-2.5 py-1.5 text-right tabular-nums text-title">
                      {row.price ? fmtMoney(row.price, currency) : ", "}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </>
  );
}

function AmountsBlock({ doc, currency, showPaid }) {
  return (
    <section className="mb-3 border border-border bg-primary/[0.03] p-3">
      <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-secondary">
        Amounts
      </h4>
      <dl className="grid gap-1.5 text-sm sm:grid-cols-2">
        <div className="flex justify-between gap-2">
          <dt className="text-secondary">Scope total</dt>
          <dd className="tabular-nums text-title">{fmtMoney(doc.scopeTotal, currency)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-secondary">Other items</dt>
          <dd className="tabular-nums text-title">{fmtMoney(doc.otherTotal, currency)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-secondary">Subtotal</dt>
          <dd className="tabular-nums text-title">{fmtMoney(doc.subtotal, currency)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-secondary">Tax</dt>
          <dd className="tabular-nums text-title">{fmtMoney(doc.taxAmount, currency)}</dd>
        </div>
        <div className="flex justify-between gap-2 border-t border-border pt-1.5 sm:col-span-2">
          <dt className="font-semibold text-title">Grand total</dt>
          <dd className="font-semibold tabular-nums text-title">
            {fmtMoney(doc.grandTotal, currency)}
          </dd>
        </div>
        {showPaid ? (
          <div className="flex justify-between gap-2 sm:col-span-2">
            <dt className="text-secondary">Payment</dt>
            <dd className="font-medium text-title">{doc.isPaid ? "Paid" : "Unpaid"}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}

function ProposalCard({ doc, currency, onPrint, showOutcome, printBusy }) {
  const meta = [
    doc.dateCreated && `Date: ${fmtDate(doc.dateCreated, currency)}`,
    doc.customerPo && `Your PO#: ${doc.customerPo}`,
    doc.dueDate && `Due: ${fmtDate(doc.dueDate, currency)}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const canPrint = Boolean(doc.printBundle?.quote || doc.printBundle?.invoicePayload);

  return (
    <article className="mb-4 border border-border bg-card/40 p-3 last:mb-0 dark:bg-card/20">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2 border-b border-border pb-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant={doc.recordType === "INVOICE" ? "success" : "primary"}
              className="rounded-full px-1.5 py-0 text-[10px] font-medium leading-4"
            >
              {doc.recordType || "RFQ"}
            </Badge>
            {doc.status ? (
              <Badge
                variant={statusBadgeVariant(doc.status)}
                className="rounded-full px-1.5 py-0 text-[10px] font-medium leading-4"
              >
                {doc.status}
              </Badge>
            ) : null}
            {doc.jobStatus ? (
              <Badge
                variant="default"
                className="rounded-full px-1.5 py-0 text-[10px] font-medium leading-4"
              >
                {doc.jobStatus}
              </Badge>
            ) : null}
          </div>
          <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-title">
            {doc.documentLabel} {doc.documentNumber || ", "}
          </h3>
          {meta ? <p className="mt-0.5 text-xs text-secondary">{meta}</p> : null}
          {showOutcome && doc.outcomeLabel ? (
            <p className="mt-1 text-xs font-medium text-title">Outcome: {doc.outcomeLabel}</p>
          ) : null}
          {doc.recordType === "INVOICE" && doc.invoicePaidDate ? (
            <p className="mt-0.5 text-xs text-secondary">
              Paid: {fmtDate(doc.invoicePaidDate, currency)}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 shrink-0 rounded-none px-2.5 text-xs"
          disabled={!canPrint || printBusy}
          onClick={() => onPrint(doc)}
        >
          <FiPrinter className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Print
        </Button>
      </div>

      {doc.motorLabel ? (
        <section className="mb-3">
          <h4 className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-secondary">
            Motor
          </h4>
          <p className="text-sm text-title">{doc.motorLabel}</p>
        </section>
      ) : null}

      <LineTables doc={doc} currency={currency} />
      <AmountsBlock doc={doc} currency={currency} showPaid={doc.recordType === "INVOICE"} />

      {doc.customerNotes ? (
        <section className="mb-2">
          <h4 className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-secondary">
            Notes from the shop
          </h4>
          <p className="whitespace-pre-wrap text-sm text-title">{doc.customerNotes}</p>
        </section>
      ) : null}

      <AttachmentLinks attachments={doc.attachments} />
    </article>
  );
}

function MotorsPanel({ motors }) {
  if (!motors.length) {
    return <p className="text-sm text-secondary">No motors on file yet.</p>;
  }
  return (
    <div className="space-y-3">
      {motors.map((m) => (
        <div
          key={m.id}
          className="border border-border bg-card/40 p-3 dark:bg-card/20"
        >
          <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-[11px] font-medium text-secondary">Manufacturer / model</dt>
              <dd className="font-medium text-title">
                {[m.manufacturer, m.modelNumber].filter(Boolean).join(" ") || ", "}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium text-secondary">HP / kW</dt>
              <dd className="text-title">{m.hpKw || ", "}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium text-secondary">Frame / type</dt>
              <dd className="text-title">{m.frameType || ", "}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium text-secondary">Volts</dt>
              <dd className="text-title">{m.volts || ", "}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium text-secondary">Amps</dt>
              <dd className="text-title">{m.amps || ", "}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium text-secondary">RPM</dt>
              <dd className="text-title">{m.rpm || ", "}</dd>
            </div>
          </dl>
        </div>
      ))}
    </div>
  );
}

function EmptySection({ message }) {
  return <p className="text-sm text-secondary">{message}</p>;
}

export default function PortalCustomerContent({ data }) {
  const {
    customer,
    shop = {},
    motors = [],
    repairsInProgress = [],
    repairHistory = [],
    invoices = [],
  } = data;
  const currency = shop.currency || "USD";
  const [tab, setTab] = useState("active");
  const [printDoc, setPrintDoc] = useState(null);

  const fmt = useCallback((value) => formatMoney(value, currency), [currency]);

  const startPrint = useCallback((doc) => {
    if (!doc?.printBundle) return;
    setPrintDoc(doc);
  }, []);

  const handlePrintDone = useCallback(() => {
    setPrintDoc(null);
  }, []);

  const printBusy = Boolean(printDoc);
  const printBundle = printDoc?.printBundle || null;

  const tabs = useMemo(
    () => [
      {
        id: "active",
        label: (
          <span className="inline-flex items-center gap-1.5">
            <FiClipboard className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Active ({repairsInProgress.length})
          </span>
        ),
        children: (
          <div>
            <p className="mb-3 text-sm text-secondary">
              Open service proposals and jobs for this account.
            </p>
            {repairsInProgress.length === 0 ? (
              <EmptySection message="No active repairs." />
            ) : (
              repairsInProgress.map((doc) => (
                <ProposalCard
                  key={doc.id}
                  doc={doc}
                  currency={currency}
                  onPrint={startPrint}
                  printBusy={printBusy}
                />
              ))
            )}
          </div>
        ),
      },
      {
        id: "history",
        label: (
          <span className="inline-flex items-center gap-1.5">
            <FiBriefcase className="h-3.5 w-3.5 shrink-0" aria-hidden />
            History ({repairHistory.length})
          </span>
        ),
        children: (
          <div>
            <p className="mb-3 text-sm text-secondary">Closed proposals and past work.</p>
            {repairHistory.length === 0 ? (
              <EmptySection message="No closed repairs on file." />
            ) : (
              repairHistory.map((doc) => (
                <ProposalCard
                  key={doc.id}
                  doc={doc}
                  currency={currency}
                  onPrint={startPrint}
                  showOutcome
                  printBusy={printBusy}
                />
              ))
            )}
          </div>
        ),
      },
      {
        id: "invoices",
        label: (
          <span className="inline-flex items-center gap-1.5">
            <FiFileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Invoices ({invoices.length})
          </span>
        ),
        children: (
          <div>
            <p className="mb-3 text-sm text-secondary">Invoice totals and payment status.</p>
            {invoices.length === 0 ? (
              <EmptySection message="No invoices on file yet." />
            ) : (
              invoices.map((doc) => (
                <ProposalCard
                  key={doc.id}
                  doc={doc}
                  currency={currency}
                  onPrint={startPrint}
                  printBusy={printBusy}
                />
              ))
            )}
          </div>
        ),
      },
      {
        id: "motors",
        label: (
          <span className="inline-flex items-center gap-1.5">
            <FiTool className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Motors ({motors.length})
          </span>
        ),
        children: (
          <div>
            <p className="mb-3 text-sm text-secondary">Motors from your service proposals.</p>
            <MotorsPanel motors={motors} />
          </div>
        ),
      },
    ],
    [currency, invoices, motors, printBusy, repairHistory, repairsInProgress, startPrint]
  );

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-6 border-b border-border pb-5">
          <div className="flex flex-wrap items-center gap-3">
            {shop.logoUrl ? (
              <img
                src={shop.logoUrl}
                alt=""
                className="h-10 w-auto max-w-[10rem] object-contain"
              />
            ) : null}
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-title">
                Customer portal
              </h1>
              <p className="mt-1 text-sm text-secondary">
                Welcome, {customer.name || customer.companyName || "Customer"}
              </p>
            </div>
          </div>
        </header>

        <Tabs
          tabs={tabs}
          value={tab}
          onChange={setTab}
          ariaLabel="Portal sections"
          listClassName="!rounded-none"
          tabButtonClassName="!rounded-none"
          panelClassName="flex min-h-0 flex-col pt-4"
        />
      </div>

      {printBundle?.documentType === "quote" && printBundle.quote ? (
        <DocumentPrintOffscreenPortal open onClose={handlePrintDone}>
          <QuotePrintSheetBody quote={printBundle.quote} fmt={fmt} />
        </DocumentPrintOffscreenPortal>
      ) : null}

      {printBundle?.documentType === "invoice" && printBundle.invoicePayload ? (
        <DocumentPrintOffscreenPortal open onClose={handlePrintDone}>
          <InvoicePrintPreview
            invoice={printBundle.invoicePayload.invoice}
            motorLabel={printBundle.invoicePayload.motorLabel}
            fromShopName={printBundle.invoicePayload.fromShopName}
            fromShopContact={printBundle.invoicePayload.fromShopContact}
            fromShopLogoUrl={printBundle.invoicePayload.fromShopLogoUrl}
            logoDocumentScale={printBundle.invoicePayload.logoDocumentScale}
            fromBillingAddress={printBundle.invoicePayload.fromBillingAddress}
            fromShippingAddress={printBundle.invoicePayload.fromShippingAddress}
            fromPaymentTermsLabel={printBundle.invoicePayload.fromPaymentTermsLabel}
            customerToName={printBundle.invoicePayload.customerToName}
            customerBillingAddress={printBundle.invoicePayload.customerBillingAddress}
            invoicePaymentOptions={printBundle.invoicePayload.invoicePaymentOptions}
            invoiceThankYouNote={printBundle.invoicePayload.invoiceThankYouNote}
            fmt={fmt}
            currency={currency}
          />
        </DocumentPrintOffscreenPortal>
      ) : null}
    </div>
  );
}
