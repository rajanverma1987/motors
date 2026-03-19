"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Table from "@/components/ui/table";
import { FormContainer, FormSectionTitle } from "@/components/ui/form-layout";

const STATE_BADGE = {
  active: "success",
  trialing: "primary",
  past_due: "warning",
  suspended: "danger",
  cancelled: "default",
};

export default function SubscriptionPageClient() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

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
    load();
  }, [load]);

  const sub = data?.subscription;
  const plan = sub?.plan;
  const txCols = [
    { key: "createdAt", label: "Date", render: (v) => (v ? new Date(v).toLocaleString() : "—") },
    { key: "type", label: "Type" },
    { key: "status", label: "Status" },
    {
      key: "amount",
      label: "Amount",
      render: (v, row) => (v != null ? `${row.currency || "USD"} ${Number(v).toFixed(2)}` : "—"),
    },
    { key: "description", label: "Note" },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold text-title">Subscription</h1>
      <p className="mt-1 text-secondary">
        Your plan, billing status, and recent payment activity. Complete PayPal checkout if your shop was assigned a
        paid plan.
      </p>

      {loading && <p className="mt-6 text-secondary">Loading…</p>}
      {err && <p className="mt-6 text-sm text-danger">{err}</p>}

      {!loading && data && (
        <div className="mt-8 space-y-8">
          {!data.accessAllowed && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-title">
              <p className="font-medium">Limited access</p>
              <p className="mt-1 text-secondary">{data.accessReason || "Update billing or contact support."}</p>
            </div>
          )}

          <FormContainer>
            <FormSectionTitle as="h2">Current plan</FormSectionTitle>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-secondary">Plan</dt>
                <dd className="font-medium text-title">{plan?.name || "—"}</dd>
              </div>
              <div>
                <dt className="text-secondary">Type</dt>
                <dd>
                  {plan?.planType === "internal" ? (
                    <Badge variant="success">Free Ultimate (internal)</Badge>
                  ) : (
                    <Badge variant="primary">PayPal subscription</Badge>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-secondary">Status</dt>
                <dd>
                  <Badge variant={STATE_BADGE[sub?.internalState] || "default"}>
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
              {sub?.nextBillingTime && (
                <div>
                  <dt className="text-secondary">Next billing</dt>
                  <dd className="text-title">{new Date(sub.nextBillingTime).toLocaleDateString()}</dd>
                </div>
              )}
              {sub?.gracePeriodEndsAt && (
                <div>
                  <dt className="text-secondary">Grace period ends</dt>
                  <dd className="text-title">{new Date(sub.gracePeriodEndsAt).toLocaleString()}</dd>
                </div>
              )}
            </dl>

            {sub?.pendingApprovalUrl ? (
              <div className="mt-6">
                <p className="text-sm text-secondary mb-2">Complete setup with PayPal to activate your paid plan.</p>
                <a href={sub.pendingApprovalUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="primary" type="button">
                    Complete payment in PayPal
                  </Button>
                </a>
              </div>
            ) : null}
          </FormContainer>

          <div>
            <h2 className="text-lg font-semibold text-title">Recent activity</h2>
            <div className="mt-3">
              <Table
                columns={txCols}
                data={data.transactions || []}
                rowKey="id"
                emptyMessage="No transactions yet."
                responsive
              />
            </div>
          </div>

          <p className="text-sm text-secondary">
            Questions?{" "}
            <Link href="/dashboard/support" className="text-primary hover:underline">
              Contact support
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
