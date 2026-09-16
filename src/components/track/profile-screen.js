"use client";

import { useEffect, useMemo, useState } from "react";
import { FiEdit2, FiLogOut } from "react-icons/fi";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import Select from "@/components/ui/select";
import { Form } from "@/components/ui/form-layout";
import { useConfirm } from "@/components/confirm-provider";
import { useToast } from "@/components/toast-provider";
import { countryNameFromCode, countrySelectOptions } from "@/lib/countries";
import { IQMOTORTRACK_FREE_MOTOR_LIMIT, IQMOTORTRACK_MONTHLY_USD } from "@/lib/iqmotortrack-marketing";
import { appFetch } from "./api";
import { useTrackAuth } from "./auth-context";
import TrackPaypalSubscribeModal from "./paypal-subscribe";

const PROFILE_FORM_ID = "track-facility-form";

export default function TrackProfileScreen() {
  const confirm = useConfirm();
  const toast = useToast();
  const { session, logout, refreshSession, token } = useTrackAuth();
  const [payOpen, setPayOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  const countryOptions = useMemo(() => countrySelectOptions(), []);

  useEffect(() => {
    refreshSession().catch(() => {});
  }, [refreshSession]);

  const openEdit = () => {
    setForm({
      facilityName: session?.facilityName || "",
      contactName: session?.contactName || "",
      phone: session?.phone || "",
      address: session?.address || "",
      city: session?.city || "",
      state: session?.state || "",
      postalCode: session?.postalCode || "",
      countryCode: session?.countryCode || "",
    });
    setEditOpen(true);
  };

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await appFetch("/api/track/facility", {
        token,
        method: "PATCH",
        body: {
          ...form,
          country: countryNameFromCode(form.countryCode) || form.countryCode,
        },
      });
      await refreshSession();
      setEditOpen(false);
      toast.success("Facility details saved.");
    } catch (err) {
      toast.error(err.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const cancelSub = async () => {
    const ok = await confirm({
      title: "Cancel Pro subscription",
      message: "You keep Pro until the current period ends. You will not be billed again.",
      confirmLabel: "Cancel subscription",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await appFetch("/api/track/subscription", { token, method: "DELETE" });
      await refreshSession();
      toast.success("Subscription will cancel at period end.");
    } catch (err) {
      toast.error(err.message || "Could not cancel.");
    }
  };

  const planVariant = session?.isPro ? "success" : "default";
  const planLabel = session?.isPro ? "Pro" : "Free";
  const ends = session?.currentPeriodEndsAt
    ? new Date(session.currentPeriodEndsAt).toLocaleDateString()
    : "";

  return (
    <div className="space-y-4 px-4 pb-6 pt-3">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Facility</p>
            <h2 className="mt-1 text-lg font-extrabold text-title">{session?.facilityName || "Facility"}</h2>
          </div>
          <button
            type="button"
            onClick={openEdit}
            aria-label="Edit facility details"
            className="shrink-0 rounded-md p-1.5 text-primary hover:bg-primary/10"
          >
            <FiEdit2 className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-sm text-secondary">{session?.contactName}</p>
        <p className="text-sm text-secondary">{session?.email}</p>
        <p className="mt-1 text-sm text-secondary">
          {[session?.address, session?.city, session?.state, session?.postalCode, session?.country]
            .filter(Boolean)
            .join(", ") || "Add your plant address so we can rank nearby shops."}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {session?.emailVerified === false ? (
            <Badge variant="warning" className="rounded-full px-2.5 py-0.5 text-xs">
              Email not verified
            </Badge>
          ) : null}
          <Badge variant={planVariant} className="rounded-full px-2.5 py-0.5 text-xs">
            {planLabel}
          </Badge>
          <span className="text-xs text-secondary">{session?.usageLabel}</span>
        </div>
        {session?.isPro && ends ? (
          <p className="mt-2 text-xs text-secondary">
            {session.cancelAtPeriodEnd ? `Cancels ${ends}` : `Renews around ${ends}`}
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="font-semibold text-title">Billing</h3>
        <p className="mt-1 text-sm text-secondary">
          Free: up to {IQMOTORTRACK_FREE_MOTOR_LIMIT} motors. Pro: ${IQMOTORTRACK_MONTHLY_USD}/month via PayPal,
          unlimited motors.
        </p>
        {!session?.isPro ? (
          <Button type="button" className="mt-3 w-full" onClick={() => setPayOpen(true)}>
            Upgrade to Pro with PayPal
          </Button>
        ) : (
          <Button type="button" variant="outline" className="mt-3 w-full" onClick={cancelSub}>
            Cancel subscription
          </Button>
        )}
        <button
          type="button"
          className="mt-3 w-full text-center text-sm font-semibold text-primary"
          onClick={() => refreshSession().catch(() => {})}
        >
          Already paid? Refresh access
        </button>
      </div>

      <Button type="button" variant="outline" className="w-full" onClick={logout}>
        <FiLogOut className="h-4 w-4 shrink-0" aria-hidden />
        Sign out
      </Button>

      <TrackPaypalSubscribeModal open={payOpen} onClose={() => setPayOpen(false)} />

      <Modal
        open={editOpen && Boolean(form)}
        onClose={() => setEditOpen(false)}
        title="Facility details"
        size="md"
        actions={
          <>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form={PROFILE_FORM_ID} size="sm" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        {form ? (
          <Form id={PROFILE_FORM_ID} onSubmit={saveProfile} className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Facility / plant name"
              name="facilityName"
              value={form.facilityName}
              onChange={setField("facilityName")}
              required
            />
            <Input
              label="Contact name"
              name="contactName"
              value={form.contactName}
              onChange={setField("contactName")}
              required
            />
            <Input label="Phone" name="phone" type="tel" value={form.phone} onChange={setField("phone")} />
            <Input label="Address" name="address" value={form.address} onChange={setField("address")} />
            <Input label="City" name="city" value={form.city} onChange={setField("city")} />
            <Input label="State" name="state" value={form.state} onChange={setField("state")} />
            <Input
              label="Postal code"
              name="postalCode"
              value={form.postalCode}
              onChange={setField("postalCode")}
            />
            <Select
              label="Country"
              name="countryCode"
              value={form.countryCode}
              onChange={setField("countryCode")}
              options={countryOptions}
              placeholder="Select country"
            />
            <p className="text-xs text-secondary sm:col-span-2">
              City and state decide which repair shops we suggest first, and they are shared with the shops
              you invite.
            </p>
          </Form>
        ) : null}
      </Modal>
    </div>
  );
}
