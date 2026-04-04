"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { FiEye } from "react-icons/fi";
import Badge from "@/components/ui/badge";
import Table from "@/components/ui/table";
import { useFormatMoney } from "@/contexts/user-settings-context";

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
 */
export default function RepairFlowQuotesTable({
  quotes,
  loading,
  rowKey = "id",
}) {
  const router = useRouter();
  const fmt = useFormatMoney();

  const columns = useMemo(
    () => [
      {
        key: "actions",
        label: "",
        width: 48,
        render: (_, row) => {
          const id = String(row.crmQuoteId || (row.source === "crm" ? row.id : "") || "").trim();
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
    [fmt, router]
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
