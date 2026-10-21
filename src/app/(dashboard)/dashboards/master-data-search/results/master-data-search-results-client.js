"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import SimplePhoneListCard from "@/components/simple/simple-phone-list-card";
import { loadMasterDataSearchSession } from "@/lib/simple-master-data-search-session";
import {
  SIMPLE_TAB_MASTER_DATA_SEARCH,
  simplePortalTabHref,
  simpleServiceProposalFormHref,
} from "@/lib/simple-portal-tabs";
import { SIMPLE_PORTAL_ROOT_CLASS } from "@/lib/simple-screen-ui";
import {
  RECORD_TYPE_INVOICE,
  RECORD_TYPE_JOB,
  RECORD_TYPE_RFQ,
} from "@/lib/simple-service-proposal-form";

function recordTypeBadgeVariant(recordType) {
  const t = String(recordType || RECORD_TYPE_RFQ).toUpperCase();
  if (t === RECORD_TYPE_INVOICE) return "success";
  if (t === RECORD_TYPE_JOB) return "primary";
  return "default";
}

function formatRecordType(recordType) {
  const t = String(recordType || RECORD_TYPE_RFQ).trim().toUpperCase();
  if (t === RECORD_TYPE_INVOICE) return RECORD_TYPE_INVOICE;
  if (t === RECORD_TYPE_JOB) return RECORD_TYPE_JOB;
  return RECORD_TYPE_RFQ;
}

export default function MasterDataSearchResultsClient() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState([]);
  const [resultMeta, setResultMeta] = useState(null);

  useEffect(() => {
    const session = loadMasterDataSearchSession();
    if (!session?.resultMeta) {
      router.replace(simplePortalTabHref(SIMPLE_TAB_MASTER_DATA_SEARCH));
      return;
    }
    setRows(session.rows);
    setResultMeta(session.resultMeta);
    setReady(true);
  }, [router]);

  const emptyMessage =
    resultMeta?.searchType === "customer"
      ? "No jobs matched these customer criteria."
      : "No jobs matched these datasheet criteria.";

  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(simplePortalTabHref(SIMPLE_TAB_MASTER_DATA_SEARCH));
  }, [router]);

  const openProposal = useCallback(
    (row) => {
      const id = String(row?.id || "").trim();
      if (!id) return;
      router.push(simpleServiceProposalFormHref(id));
    },
    [router]
  );

  const title = useMemo(() => {
    const count = rows.length;
    const truncated = resultMeta?.truncated;
    if (!resultMeta) return "Results";
    if (truncated) return `Results (${count} of first ${resultMeta.limit || 200})`;
    return `Results (${count})`;
  }, [resultMeta, rows.length]);

  if (!ready) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center text-sm text-secondary">
        Loading…
      </div>
    );
  }

  return (
    <div
      className={`${SIMPLE_PORTAL_ROOT_CLASS} flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden bg-bg`}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-border bg-card px-3 py-2.5">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-none border border-border bg-card text-title hover:bg-primary/10"
          aria-label="Back to search"
        >
          <FiArrowLeft className="h-5 w-5" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold text-title">{title}</h1>
          {resultMeta?.truncated ? (
            <p className="truncate text-[11px] text-warning">
              Narrow your criteria for more specific results.
            </p>
          ) : null}
        </div>
        <Button type="button" variant="outline" size="sm" className="!rounded-none" onClick={handleBack}>
          Search again
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-secondary">{emptyMessage}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((row) => {
              const typeLabel = formatRecordType(row.recordType);
              return (
                <li key={String(row.id || row.jobNumber)}>
                  <SimplePhoneListCard
                    title={row.jobNumber || "Job"}
                    subtitle={row.customer || "-"}
                    badge={
                      <Badge
                        variant={recordTypeBadgeVariant(typeLabel)}
                        className="rounded-full px-2.5 py-0.5 text-xs"
                      >
                        {typeLabel}
                      </Badge>
                    }
                    meta={row.contactName ? <span>{row.contactName}</span> : null}
                    onClick={() => openProposal(row)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
