"use client";

import { useEffect, useMemo, useState } from "react";
import { FiAlertTriangle, FiArrowLeft, FiArrowRight, FiSearch } from "react-icons/fi";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import Checkbox from "@/components/ui/checkbox";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import RadioGroup from "@/components/ui/radio-group";
import Textarea from "@/components/ui/textarea";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import {
  TRACK_LOGISTICS_LABEL,
  TRACK_LOGISTICS_OPTIONS,
  TRACK_URGENCY_OPTIONS,
} from "@/lib/track-rfq";
import { trackMotorTitle } from "@/lib/track-motor-fields";
import { appFetch } from "./api";
import { useTrackAuth } from "./auth-context";
import TrackPhotoInput from "./photo-input";
import { TrackRow, trackDateLabel } from "./ui";

const FORM_ID = "track-motor-down-form";

function emptyForm() {
  return {
    failureDescription: "",
    urgency: "standard",
    logistics: "either",
    neededBackBy: "",
    budgetLimit: "",
    failurePhotos: [],
    shareDatasheet: true,
    shareServiceHistory: true,
    shareBudget: false,
  };
}

/**
 * §7 - Motor Down. Three screens from the motor page to a sent RFQ, with
 * everything already known about the motor pre-filled.
 */
export default function TrackMotorDownFlow({ open, motor, onClose, onSent }) {
  const toast = useToast();
  const { token, session } = useTrackAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm());
  const [shops, setShops] = useState([]);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [maxShops, setMaxShops] = useState(null);
  const [loadingShops, setLoadingShops] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setForm(emptyForm());
    setSelected([]);
    setSearch("");
  }, [open]);

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const loadShops = async (term = "") => {
    setLoadingShops(true);
    try {
      const params = new URLSearchParams({
        motorId: motor.id,
        urgency: form.urgency,
        logistics: form.logistics,
      });
      if (term) params.set("q", term);
      const data = await appFetch(`/api/track/shops?${params.toString()}`, { token });
      setShops(data.shops || []);
      setMaxShops(data.maxShops ?? null);
    } catch (err) {
      toast.error(err.message || "Could not load shops.");
    } finally {
      setLoadingShops(false);
    }
  };

  useEffect(() => {
    if (open && step === 2) loadShops(search).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  const selectedShops = useMemo(
    () => shops.filter((shop) => selected.includes(shop.id)),
    [shops, selected]
  );

  const toggleShop = (shop) => {
    setSelected((prev) => {
      if (prev.includes(shop.id)) return prev.filter((id) => id !== shop.id);
      if (maxShops && prev.length >= maxShops) {
        toast.error(
          `The free plan allows up to ${maxShops} shops per RFQ. Upgrade to Pro to invite more.`
        );
        return prev;
      }
      return [...prev, shop.id];
    });
  };

  const goToShops = () => {
    if (!form.failureDescription.trim()) {
      toast.error("Describe what happened so shops can quote accurately.");
      return;
    }
    setStep(2);
  };

  const goToReview = () => {
    if (selected.length === 0) {
      toast.error("Select at least one shop.");
      return;
    }
    setStep(3);
  };

  const send = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const data = await appFetch("/api/track/rfqs", {
        token,
        method: "POST",
        body: {
          motorId: motor.id,
          failureDescription: form.failureDescription,
          urgency: form.urgency,
          logistics: form.logistics,
          neededBackBy: form.neededBackBy || null,
          budgetLimit: form.budgetLimit || null,
          failurePhotos: form.failurePhotos,
          shareDatasheet: form.shareDatasheet,
          shareServiceHistory: form.shareServiceHistory,
          shareBudget: form.shareBudget,
          listingIds: selected,
        },
      });
      const failed = (data.deliveries || []).filter((d) => !d.ok);
      if (failed.length) {
        toast.error(
          `${failed.length} shop${failed.length === 1 ? "" : "s"} could not be reached yet. They stay pending and will retry.`
        );
      } else {
        toast.success(`RFQ sent to ${selected.length} shop${selected.length === 1 ? "" : "s"}.`);
      }
      onSent?.(data.rfq || null);
      onClose();
    } catch (err) {
      toast.error(err.message || "Could not send the RFQ.");
    } finally {
      setSending(false);
    }
  };

  const headerActions =
    step === 3 ? (
      <>
        <Button type="button" size="sm" variant="outline" onClick={() => setStep(2)}>
          Back
        </Button>
        <Button type="submit" form={FORM_ID} size="sm" disabled={sending}>
          {sending ? "Sending…" : "Send RFQ"}
        </Button>
      </>
    ) : (
      <Button type="button" size="sm" variant="outline" onClick={onClose}>
        Cancel
      </Button>
    );

  const verified = session?.emailVerified !== false;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Motor down (${step} of 3)`}
      size="lg"
      actions={headerActions}
    >
      {!verified ? (
        <div className="mb-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-title">
          Verify your email before sending RFQs. Shops only receive requests from verified plants.
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-danger/40 bg-danger/10 p-3">
            <p className="flex items-center gap-1.5 text-sm font-bold text-title">
              <FiAlertTriangle className="h-4 w-4 shrink-0 text-danger" aria-hidden />
              {trackMotorTitle(motor)} is marked Down
            </p>
            <p className="mt-1 text-xs text-secondary">
              The status changed as soon as you tapped Motor Down, even if you leave this flow.
            </p>
          </div>
          <Textarea
            label="What happened"
            rows={4}
            value={form.failureDescription}
            onChange={setField("failureDescription")}
            placeholder="Tripped on overload, smell of burnt insulation, will not restart."
          />
          <RadioGroup
            label="Urgency"
            name="track-urgency"
            layout="horizontal"
            value={form.urgency}
            options={TRACK_URGENCY_OPTIONS}
            onChange={setField("urgency")}
          />
          {form.urgency === "emergency" ? (
            <p className="rounded-lg border border-danger/40 bg-danger/10 p-2.5 text-xs font-semibold text-danger">
              Emergency requests are flagged to shops with higher prominence.
            </p>
          ) : null}
          <RadioGroup
            label="Logistics"
            name="track-logistics"
            value={form.logistics}
            options={TRACK_LOGISTICS_OPTIONS}
            onChange={setField("logistics")}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Needed back by"
              type="date"
              value={form.neededBackBy}
              onChange={setField("neededBackBy")}
            />
            <Input
              label="Budget limit or not to exceed"
              value={form.budgetLimit}
              onChange={setField("budgetLimit")}
              help="Shared with shops only if you opt in on the review screen."
            />
          </div>
          <TrackPhotoInput
            label="Photos of the failure"
            multiple
            max={4}
            values={form.failurePhotos}
            onChange={(urls) => setForm((prev) => ({ ...prev, failurePhotos: urls }))}
          />
          <Button type="button" className="w-full" onClick={goToShops}>
            Select shops
            <FiArrowRight className="h-4 w-4 shrink-0" aria-hidden />
          </Button>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-secondary">
              {selected.length} selected
              {maxShops ? ` of ${maxShops} allowed on your plan` : " (unlimited on Pro)"}
            </p>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
            >
              <FiArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Failure details
            </button>
          </div>

          <div className="flex gap-2">
            <Input
              className="flex-1"
              placeholder="Search by shop, city or state"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button type="button" size="sm" variant="outline" onClick={() => loadShops(search)}>
              <FiSearch className="h-4 w-4 shrink-0" aria-hidden />
              Search
            </Button>
          </div>

          {loadingShops ? <p className="text-xs text-secondary">Ranking shops near you…</p> : null}
          {!loadingShops && shops.length === 0 ? (
            <p className="text-xs text-secondary">
              No approved shops matched. Try a wider search, or add your facility city and state in Profile so
              nearby shops rank first.
            </p>
          ) : null}

          <ul className="space-y-2">
            {shops.map((shop) => {
              const isSelected = selected.includes(shop.id);
              return (
                <li
                  key={shop.id}
                  className={`rounded-2xl border p-3 ${
                    isSelected ? "border-primary bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleShop(shop)}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-border accent-primary"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-title">{shop.companyName}</p>
                      <p className="mt-0.5 text-[11px] text-secondary">
                        {[shop.city, shop.state].filter(Boolean).join(", ") || "Location not listed"} ·{" "}
                        {shop.distanceLabel}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {shop.servicedBefore ? (
                          <Badge variant="success" className="rounded-full px-2 py-0.5 text-[10px]">
                            Serviced this motor
                            {shop.lastServicedAt ? ` · ${trackDateLabel(shop.lastServicedAt)}` : ""}
                          </Badge>
                        ) : null}
                        <Badge
                          variant={shop.respondsBy === "in_app" ? "primary" : "default"}
                          className="rounded-full px-2 py-0.5 text-[10px]"
                        >
                          {shop.respondsBy === "in_app" ? "Responds in app" : "Responds by email"}
                        </Badge>
                        {shop.rating ? (
                          <Badge variant="default" className="rounded-full px-2 py-0.5 text-[10px]">
                            {shop.rating} ★ ({shop.reviewCount})
                          </Badge>
                        ) : null}
                        {shop.capabilityTags.slice(0, 4).map((tag) => (
                          <Badge key={tag} variant="default" className="rounded-full px-2 py-0.5 text-[10px]">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      {shop.respondsBy === "email" ? (
                        <p className="mt-1.5 text-[10px] text-secondary">
                          This shop has no IQMotorBase account yet, so datasheet write-back is not possible until
                          it claims its listing.
                        </p>
                      ) : null}
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>

          <Button type="button" className="w-full" onClick={goToReview} disabled={selected.length === 0}>
            Review and send
            <FiArrowRight className="h-4 w-4 shrink-0" aria-hidden />
          </Button>
        </div>
      ) : null}

      {step === 3 ? (
        <Form id={FORM_ID} onSubmit={send} className="space-y-4">
          <div className="rounded-2xl border border-border bg-bg p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-secondary">Motor snapshot</p>
            <TrackRow label="Motor" value={trackMotorTitle(motor)} />
            <TrackRow label="Serial number" value={motor.serialNumber} />
            <TrackRow label="Power type" value={motor.powerType} />
            <TrackRow label="Facility location" value={motor.facilityLocation} />
            <TrackRow label="Urgency" value={form.urgency === "emergency" ? "Emergency" : "Standard"} />
            <TrackRow label="Logistics" value={TRACK_LOGISTICS_LABEL[form.logistics]} />
            <TrackRow label="Needed back by" value={trackDateLabel(form.neededBackBy)} />
          </div>

          <div className="space-y-2 rounded-2xl border border-border bg-bg p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-secondary">What you share</p>
            <p className="text-[11px] text-secondary">
              Nameplate, failure description, urgency, logistics and your facility location are always shared.
            </p>
            <Checkbox
              label={
                motor.datasheetVersion
                  ? `Datasheet (version ${motor.datasheetVersion})`
                  : "Datasheet (none recorded yet)"
              }
              checked={form.shareDatasheet}
              onChange={(e) => setForm((prev) => ({ ...prev, shareDatasheet: e.target.checked }))}
            />
            <Checkbox
              label="Service history summary, without any shop's prices"
              checked={form.shareServiceHistory}
              onChange={(e) => setForm((prev) => ({ ...prev, shareServiceHistory: e.target.checked }))}
            />
            <Checkbox
              label="Budget limit"
              checked={form.shareBudget}
              onChange={(e) => setForm((prev) => ({ ...prev, shareBudget: e.target.checked }))}
              disabled={!form.budgetLimit}
            />
          </div>

          <div className="rounded-2xl border border-border bg-bg p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-secondary">
              Shops ({selectedShops.length})
            </p>
            <ul className="mt-2 space-y-1.5">
              {selectedShops.map((shop) => (
                <li key={shop.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-xs font-semibold text-title">{shop.companyName}</span>
                  <Badge
                    variant={shop.respondsBy === "in_app" ? "primary" : "default"}
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px]"
                  >
                    {shop.respondsBy === "in_app" ? "In app" : "Email"}
                  </Badge>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[10px] text-secondary">
              Shops are told how many shops were invited, never which ones.
            </p>
          </div>

          <Button type="submit" form={FORM_ID} className="w-full" disabled={sending}>
            {sending ? "Sending…" : `Send RFQ to ${selectedShops.length} shop${selectedShops.length === 1 ? "" : "s"}`}
          </Button>
        </Form>
      ) : null}
    </Modal>
  );
}
