"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Table from "@/components/ui/table";
import { FormContainer, FormSectionTitle } from "@/components/ui/form-layout";
import { sortRowsClient } from "@/lib/client-table-sort";
import { useFormatDate, useFormatDateTime } from "@/contexts/user-settings-context";
import { TRIAL_PLAN_SLUG } from "@/lib/trial-subscription-messages";
import { LISTING_ONLY_PLAN_SLUG } from "@/lib/listing-account-messages";
import { simpleSettingsHref } from "@/lib/simple-settings-nav";

const FREE_ULTIMATE_PLAN_SLUG = "free-ultimate";

const STATE_BADGE = {
  active: "success",
  trialing: "primary",
  past_due: "warning",
  suspended: "danger",
  cancelled: "default",
};

export default function SimpleSubscriptionSection() {
  const formatDate = useFormatDate();
  const formatDateTime = useFormatDateTime();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [txSort, setTxSort] = useState({ key: null, direction: "asc" });

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/dashboard/subscription", { credentials: "include" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to load");
      setData(j);
    } catch (e) {
      setErr(e.message || "Failed to load");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sub = data?.subscription;
  const plan = sub?.plan;

  const getTxSortValue = useCallback((row, key) => {
    if (key === "createdAt") {
      const t = row?.createdAt ? new Date(row.createdAt).getTime() : NaN;
      return Number.isFinite(t) ? t : null;
    }
    if (key === "amount") return row?.amount;
    return row?.[key];
  }, []);

  const sortedTransactions = useMemo(
    () => sortRowsClient(data?.transactions || [], txSort, getTxSortValue),
    [data?.transactions, txSort, getTxSortValue]
  );

  const txCols = useMemo(
    () => [
      {
        key: "createdAt",
        label: "Date",
        sortable: true,
        render: (v) => <span className="tabular-nums">{formatDate(v)}</span>,
      },
      { key: "type", label: "Type", sortable: true },
      { key: "status", label: "Status", sortable: true },
      {
        key: "amount",
        label: "Amount",
        sortable: true,
        render: (v, row) => (v != null ? `${row.currency || "USD"} ${Number(v).toFixed(2)}` : "—"),
      },
      { key: "description", label: "Note", sortable: true },
    ],
    [formatDate]
  );

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div>
        <h2 className="text-lg font-semibold text-title">Subscription</h2>
        <p className="mt-1 text-sm text-secondary">Plan, billing status, and recent payments.</p>
      </div>

      {loading ? <p className="text-sm text-secondary">Loading…</p> : null}
      {err ? <p className="text-sm text-danger">{err}</p> : null}

      {!loading && data ? (
        <div className="space-y-8">
          {!data.accessAllowed ? (
            <div className="rounded-sm border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-title">
              <p className="font-medium">Limited access</p>
              <p className="mt-1 text-secondary">{data.accessReason || "Update billing or contact support."}</p>
            </div>
          ) : null}

          <FormContainer>
            <FormSectionTitle as="h3">Current plan</FormSectionTitle>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-secondary">Plan</dt>
                <dd className="font-medium text-title">{plan?.name || "—"}</dd>
              </div>
              <div>
                <dt className="text-secondary">Type</dt>
                <dd>
                  {plan?.planType === "internal" ? (
                    plan?.slug === TRIAL_PLAN_SLUG ? (
                      <Badge variant="primary">Trial (internal)</Badge>
                    ) : plan?.slug === FREE_ULTIMATE_PLAN_SLUG ? (
                      <Badge variant="success">Free Ultimate (internal)</Badge>
                    ) : plan?.slug === LISTING_ONLY_PLAN_SLUG ? (
                      <Badge variant="warning">Directory listing (internal)</Badge>
                    ) : (
                      <Badge variant="default">Internal plan</Badge>
                    )
                  ) : (
                    <Badge variant="primary">PayPal subscription</Badge>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-secondary">Status</dt>
                <dd>
                  <Badge
                    variant={STATE_BADGE[sub?.internalState] || "default"}
                    className="rounded-full px-2.5 py-0.5 text-xs"
                  >
                    {sub?.internalState || "—"}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-secondary">Negotiated amount</dt>
                <dd className="text-title">
                  {sub?.currencySnapshot || "USD"}{" "}
                  {sub?.customPriceSnapshot != null ? Number(sub.customPriceSnapshot).toFixed(2) : "—"}{" "}
                  {plan?.billingCycle ? `· ${plan.billingCycle}` : ""}
                </dd>
              </div>
              {sub?.nextBillingTime ? (
                <div>
                  <dt className="text-secondary">Next billing</dt>
                  <dd className="text-title">{formatDate(sub.nextBillingTime)}</dd>
                </div>
              ) : null}
              {sub?.gracePeriodEndsAt ? (
                <div>
                  <dt className="text-secondary">Grace period ends</dt>
                  <dd className="text-title">{formatDateTime(sub.gracePeriodEndsAt)}</dd>
                </div>
              ) : null}
            </dl>

            {sub?.pendingApprovalUrl ? (
              <div className="mt-6">
                <p className="mb-2 text-sm text-secondary">Complete setup with PayPal to activate your paid plan.</p>
                <a href={sub.pendingApprovalUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="primary" type="button" size="sm">
                    Complete payment in PayPal
                  </Button>
                </a>
              </div>
            ) : null}
          </FormContainer>

          <div>
            <h3 className="text-base font-semibold text-title">Recent activity</h3>
            <div className="mt-3">
              <Table
                columns={txCols}
                data={sortedTransactions}
                rowKey="id"
                emptyMessage="No transactions yet."
                sortState={txSort}
                onSort={(key, direction) => setTxSort({ key, direction })}
                responsive
                dense
              />
            </div>
          </div>

          <p className="text-sm text-secondary">
            Questions?{" "}
            <Link href={simpleSettingsHref("support")} className="text-primary hover:underline">
              Contact support
            </Link>
            .
          </p>
        </div>
      ) : null}
    </div>
  );
}
