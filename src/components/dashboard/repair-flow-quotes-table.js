"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { FiEye } from "react-icons/fi";
import { LuQrCode } from "react-icons/lu";
import Badge from "@/components/ui/badge";
import Table from "@/components/ui/table";
import { useFormatMoney } from "@/contexts/user-settings-context";

function quoteRowRfqForTag(row) {
  return String(row?.rfqNumber || row?.crmRfqNumber || "").trim();
}

const STAGE_LABELS = { preliminary: "Preliminary", final: "Final" };
const STATUS_LABELS = {
  draft: "Draft",
  waiting_approval: "Waiting approval",
  approved: "Approved",
  rejected: "Rejected",
  locked: "Locked",
};

function statusVariant(s) {
  const v = String(s || "").toLowerCase();
  if (v === "approved") return "success";
  if (v === "rejected") return "danger";
  if (v === "waiting_approval") return "warning";
  return "default";
}

/**
 * Pipeline flow quotes for a repair job: compact table with link to CRM quote (RFQ) on Quotes page when present.
 * @param {(rfqNumber: string) => void | Promise<void>} [props.onPrintMotorTagQr] — print motor tag QR (shop app / WO).
 */
export default function RepairFlowQuotesTable({
  quotes,
  loading,
  rowKey = "id",
  onPrintMotorTagQr,
}) {
  const router = useRouter();
  const fmt = useFormatMoney();

  const columns = useMemo(
    () => [
      {
        key: "actions",
        label: "",
        width: 96,
        render: (_, row) => {
          const id = String(row.crmQuoteId || (row.source === "crm" ? row.id : "") || "").trim();
          const rfq = quoteRowRfqForTag(row);
          return (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                disabled={!id}
                onClick={() => id && router.push(`/dashboard/quotes?edit=${encodeURIComponent(id)}`)}
                className="inline-flex rounded-md p-2 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={id ? "Open quote on Quotes page to view and edit" : "No RFQ linked"}
                title={
                  id
                    ? "Open on Quotes page (full quote, view and edit)"
                    : "Preliminary pipeline quotes only — create a final quote or add an RFQ to get a linked Quotes row."
                }
              >
                <FiEye className="h-4 w-4 shrink-0" />
              </button>
              <button
                type="button"
                disabled={!rfq || typeof onPrintMotorTagQr !== "function"}
                onClick={() => rfq && onPrintMotorTagQr(rfq)}
                className="inline-flex rounded-md p-2 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={rfq ? "Print motor tag QR for shop app" : "No RFQ number — save or link a CRM quote first"}
                title={
                  rfq
                    ? "Print QR motor tag (technician scans → work order for this RFQ)"
                    : "RFQ number required — add or link a CRM quote on this job."
                }
              >
                <LuQrCode className="h-4 w-4 shrink-0" aria-hidden />
              </button>
            </div>
          );
        },
      },
      {
        key: "stage",
        label: "Type",
        render: (s) => (
          <Badge variant="default" className="rounded-full px-2.5 py-0.5 text-xs">
            {STAGE_LABELS[s] || s || "—"}
          </Badge>
        ),
      },
      {
        key: "status",
        label: "Status",
        render: (s) => (
          <Badge variant={statusVariant(s)} className="rounded-full px-2.5 py-0.5 text-xs">
            {STATUS_LABELS[s] || s || "—"}
          </Badge>
        ),
      },
      {
        key: "crmRfqNumber",
        label: "RFQ#",
        render: (v) => (v ? String(v) : "—"),
      },
      {
        key: "subtotal",
        label: "Subtotal",
        render: (v) => (v != null && Number.isFinite(Number(v)) ? fmt(Number(v)) : "—"),
      },
      {
        key: "updatedAt",
        label: "Updated",
        render: (v) => (v ? new Date(v).toLocaleString() : "—"),
      },
    ],
    [fmt, router, onPrintMotorTagQr]
  );

  return (
    <Table
      columns={columns}
      data={quotes}
      rowKey={rowKey}
      loading={loading}
      emptyMessage="No preliminary or final quotes yet."
      fillHeight={false}
      paginateClientSide={false}
      responsive
    />
  );
}
