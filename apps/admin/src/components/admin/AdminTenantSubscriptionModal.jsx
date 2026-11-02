"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Select from "@/components/ui/select";
import Textarea from "@/components/ui/textarea";
import Badge from "@/components/ui/badge";
import { Form, FormSectionTitle } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";

const FORM_ID = "admin-tenant-subscription-form";

const PACKAGE_OPTIONS = [
  { value: "trial", label: "Trial (3-customer limit)" },
  { value: "free_ultimate", label: "Free Ultimate" },
  { value: "paypal", label: "PayPal plan…" },
];

function stateVariant(state, revoked) {
  if (revoked) return "danger";
  const s = String(state || "").toLowerCase();
  if (s === "active" || s === "trialing") return "success";
  if (s === "past_due") return "warning";
  if (s === "cancelled" || s === "suspended" || s === "expired") return "danger";
  return "default";
}

export default function AdminTenantSubscriptionModal({ tenant, open, onClose, onSaved }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [packageKind, setPackageKind] = useState("trial");
  const [planId, setPlanId] = useState("");
  const [plans, setPlans] = useState([]);
  const [revokeReason, setRevokeReason] = useState("");
  const [warning, setWarning] = useState("");

  const slug = tenant?.slug || "";

  useEffect(() => {
    if (!open || !slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setWarning("");
      setRevokeReason("");
      setPackageKind("trial");
      setPlanId("");
      try {
        const [subRes, plansRes] = await Promise.all([
          fetch(`/api/admin/tenants/${encodeURIComponent(slug)}/subscription`, {
            credentials: "include",
          }),
          fetch("/api/admin/subscription-plans?pageSize=100", { credentials: "include" }),
        ]);
        const subData = await subRes.json().catch(() => ({}));
        const plansData = await plansRes.json().catch(() => ({}));
        if (!subRes.ok) throw new Error(subData.error || "Failed to load subscription");
        if (cancelled) return;
        setSubscription(subData.subscription || null);
        setWarning(subData.warning || "");
        const paypalPlans = (plansData.plans || [])
          .filter((p) => p.active !== false && p.planType === "paypal")
          .map((p) => ({
            value: p.id,
            label: `${p.name} ($${Number(p.customPrice || 0).toFixed(2)} / ${p.billingCycle})`,
            name: p.name,
          }));
        setPlans(paypalPlans);
        if (paypalPlans[0]) setPlanId(paypalPlans[0].value);
      } catch (e) {
        if (!cancelled) toast.error(e.message || "Failed to load subscription");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, slug, toast]);

  async function postAction(body) {
    const res = await fetch(`/api/admin/tenants/${encodeURIComponent(slug)}/subscription`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  async function handleAssign(e) {
    e.preventDefault();
    if (!slug || saving) return;
    setSaving(true);
    try {
      let data;
      if (packageKind === "trial") {
        data = await postAction({ action: "assign_trial" });
        toast.success("Trial assigned");
      } else if (packageKind === "free_ultimate") {
        data = await postAction({ action: "assign_free_ultimate" });
        toast.success("Free Ultimate assigned");
      } else if (packageKind === "paypal") {
        if (!planId) throw new Error("Select a PayPal plan");
        data = await postAction({ action: "assign_paypal", planId });
        toast.success("PayPal plan assigned");
        if (data.approvalUrl) {
          window.open(data.approvalUrl, "_blank", "noopener,noreferrer");
        }
      } else {
        throw new Error("Select a package");
      }
      setSubscription(data.subscription || null);
      onSaved?.(data.subscription);
    } catch (err) {
      toast.error(err.message || "Assign failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleRevoke() {
    if (!revokeReason.trim()) {
      toast.error("Enter a revoke reason");
      return;
    }
    const ok = await confirm({
      title: "Revoke shop access?",
      message: `This will block portal access for ${tenant?.ownerEmail || slug}.`,
      confirmLabel: "Revoke access",
      variant: "danger",
    });
    if (!ok) return;
    const ok2 = await confirm({
      title: "Confirm revoke",
      message: "Revoke is high risk. Confirm again to continue.",
      confirmLabel: "Revoke access",
      variant: "danger",
    });
    if (!ok2) return;
    setSaving(true);
    try {
      const data = await postAction({ action: "revoke", reason: revokeReason.trim() });
      setSubscription(data.subscription || null);
      toast.success("Access revoked");
      onSaved?.(data.subscription);
    } catch (err) {
      toast.error(err.message || "Revoke failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleClearRevoke() {
    setSaving(true);
    try {
      const data = await postAction({ action: "clear_revoke" });
      setSubscription(data.subscription || null);
      toast.success("Revoke cleared");
      onSaved?.(data.subscription);
    } catch (err) {
      toast.error(err.message || "Clear revoke failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleExtendGrace() {
    setSaving(true);
    try {
      const data = await postAction({ action: "extend_grace", days: 7 });
      setSubscription(data.subscription || null);
      toast.success("Grace extended by 7 days");
      onSaved?.(data.subscription);
    } catch (err) {
      toast.error(err.message || "Extend grace failed");
    } finally {
      setSaving(false);
    }
  }

  const planName = subscription?.plan?.name || "None";
  const state = subscription?.revokedAt ? "revoked" : subscription?.internalState || "none";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Subscription · ${tenant?.slug || ""}`}
      size="md"
      actions={
        <Button type="submit" form={FORM_ID} size="sm" disabled={saving || loading || !tenant?.ownerEmail}>
          {saving ? "Saving…" : "Assign"}
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
          <p className="text-title">
            <span className="font-medium">{tenant?.companyName || tenant?.slug}</span>
            {tenant?.host ? (
              <span className="text-secondary"> · {tenant.host}</span>
            ) : null}
          </p>
          <p className="mt-0.5 text-secondary">{tenant?.ownerEmail || "No owner email"}</p>
          {warning ? <p className="mt-2 text-sm text-danger">{warning}</p> : null}
        </div>

        {loading ? (
          <p className="text-sm text-secondary">Loading…</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-secondary">Current:</span>
            <Badge
              variant={stateVariant(subscription?.internalState, !!subscription?.revokedAt)}
              className="rounded-full px-2.5 py-0.5 text-xs"
            >
              {planName} · {state}
            </Badge>
          </div>
        )}

        <Form id={FORM_ID} onSubmit={handleAssign} className="space-y-4">
          <FormSectionTitle>Assign package</FormSectionTitle>
          <Select
            label="Package"
            value={packageKind}
            onChange={(e) => setPackageKind(e.target.value)}
            options={PACKAGE_OPTIONS}
            required
          />
          {packageKind === "paypal" ? (
            <Select
              label="PayPal plan"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
              options={plans.length ? plans : [{ value: "", label: "No active PayPal plans" }]}
              required
            />
          ) : null}
        </Form>

        <div className="space-y-3 border-t border-border pt-4">
          <FormSectionTitle>Access controls</FormSectionTitle>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" disabled={saving} onClick={handleExtendGrace}>
              Extend grace 7 days
            </Button>
            {subscription?.revokedAt ? (
              <Button type="button" size="sm" variant="outline" disabled={saving} onClick={handleClearRevoke}>
                Clear revoke
              </Button>
            ) : null}
          </div>
          <Textarea
            label="Revoke reason"
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
            rows={2}
            placeholder="Required to revoke access"
          />
          <Button
            type="button"
            size="sm"
            variant="danger"
            disabled={saving || !revokeReason.trim()}
            onClick={handleRevoke}
          >
            Revoke access
          </Button>
        </div>
      </div>
    </Modal>
  );
}
