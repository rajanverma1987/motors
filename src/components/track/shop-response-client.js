"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import Checkbox from "@/components/ui/checkbox";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Textarea from "@/components/ui/textarea";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import {
  TRACK_DECLINE_REASONS,
  TRACK_PRICE_BASIS_OPTIONS,
  trackFormatMoney,
} from "@/lib/track-rfq";
import { appFetch } from "./api";
import { TrackCard, TrackRow, trackDateLabel } from "./ui";

const WORK_TYPE_LABEL = {
  rewind: "Rewind",
  bearing_replacement: "Bearing replacement",
  mechanical: "Mechanical",
  testing: "Testing",
  field_service: "Field service",
  other: "Other",
};

const emptyForm = () => ({
  totalPrice: "",
  currency: "USD",
  priceBasis: "fixed",
  teardownFee: "",
  turnaroundDays: "",
  validUntil: "",
  scopeSummary: "",
  logisticsIncluded: false,
  logisticsCost: "",
  warrantyMonths: "",
  warrantyCoverage: "",
  notes: "",
});

/**
 * §9.7 - no-login response page for shops whose directory listing has no account.
 * The secure link in the email is the only credential, so nothing here needs auth.
 */
export default function TrackShopResponseClient({ rfqId, invitationId }) {
  const toast = useToast();
  const searchParams = useSearchParams();
  const token = String(searchParams.get("token") || "");
  const [state, setState] = useState({ loading: true, error: "", rfq: null });
  const [form, setForm] = useState(emptyForm());
  const [declineReason, setDeclineReason] = useState("");
  const [declineNote, setDeclineNote] = useState("");
  const [mode, setMode] = useState("propose");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");

  const base = `/api/track/shop-response/${rfqId}/${invitationId}?token=${encodeURIComponent(token)}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await appFetch(base);
        if (!cancelled) setState({ loading: false, error: "", rfq: data.rfq });
      } catch (err) {
        if (!cancelled) {
          setState({ loading: false, error: err.message || "That link is not valid.", rfq: null });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [base]);

  const setField = (key) => (e) =>
    setForm((prev) => ({
      ...prev,
      [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

  const submitProposal = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await appFetch(base, {
        method: "POST",
        body: {
          action: "propose",
          totalPrice: Number(form.totalPrice),
          currency: form.currency,
          priceBasis: form.priceBasis,
          teardownFee: form.teardownFee === "" ? null : Number(form.teardownFee),
          turnaroundDays: Number(form.turnaroundDays),
          validUntil: form.validUntil,
          scopeSummary: form.scopeSummary,
          logisticsIncluded: form.logisticsIncluded,
          logisticsCost: form.logisticsCost === "" ? null : Number(form.logisticsCost),
          warrantyMonths: form.warrantyMonths === "" ? null : Number(form.warrantyMonths),
          warrantyCoverage: form.warrantyCoverage,
          notes: form.notes,
        },
      });
      setDone(
        data.version > 1
          ? "Your revised proposal was sent to the plant."
          : "Your proposal was sent to the plant."
      );
    } catch (err) {
      toast.error(err.message || "Could not send your proposal.");
    } finally {
      setBusy(false);
    }
  };

  const submitDecline = async (e) => {
    e.preventDefault();
    if (!declineReason) {
      toast.error("Pick a reason so the plant knows why.");
      return;
    }
    setBusy(true);
    try {
      await appFetch(base, {
        method: "POST",
        body: { action: "decline", reason: declineReason, reasonNote: declineNote },
      });
      setDone("Thanks. The plant has been told you cannot quote this one.");
    } catch (err) {
      toast.error(err.message || "Could not send your reply.");
    } finally {
      setBusy(false);
    }
  };

  if (state.loading) {
    return <p className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-secondary">Loading the request…</p>;
  }

  if (state.error || !state.rfq) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-xl font-extrabold text-title">This link is not usable</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-secondary">{state.error}</p>
        <Link href="/" className="mt-4 inline-block text-sm font-semibold text-primary">
          Go to the homepage
        </Link>
      </div>
    );
  }

  const rfq = state.rfq;

  if (done) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-xl font-extrabold text-title">Reply sent</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-secondary">{done}</p>
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-left">
          <h2 className="font-bold text-title">Want the full toolkit?</h2>
          <p className="mt-1 text-sm text-secondary">
            Claim your shop listing to receive these requests in your dashboard, convert them into quotes and
            jobs, and keep the customer&apos;s motor datasheet in sync automatically.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/list-your-electric-motor-services">
              <Button type="button" size="sm">
                Claim your listing
              </Button>
            </Link>
            <Link href="/pricing">
              <Button type="button" size="sm" variant="outline">
                See shop plans
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const readOnly = rfq.closed || rfq.invitationStatus === "declined";

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
          Motor repair request via IQMotorTrack
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-title">{rfq.motorTitle}</h1>
        <p className="mt-1 text-sm text-secondary">
          From {rfq.facilityName}
          {rfq.facilityCity ? `, ${rfq.facilityCity}` : ""}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge
            variant={rfq.urgency === "emergency" ? "danger" : "default"}
            className="rounded-full px-2.5 py-0.5 text-xs"
          >
            {rfq.urgencyLabel}
          </Badge>
          <Badge variant="default" className="rounded-full px-2.5 py-0.5 text-xs">
            Sent to {rfq.invitedShopCount} {rfq.invitedShopCount === 1 ? "shop" : "shops"}
          </Badge>
          {rfq.reference ? (
            <Badge variant="primary" className="rounded-full px-2.5 py-0.5 text-xs">
              {rfq.reference}
            </Badge>
          ) : null}
        </div>
      </header>

      {rfq.closed ? (
        <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-title">
          {rfq.awardedElsewhere
            ? "This request has been awarded to another shop. Thank you for your time."
            : "This request is closed, so no further proposals can be sent."}
        </div>
      ) : null}

      <TrackCard title="What happened">
        <p className="whitespace-pre-line text-sm text-title">{rfq.failureDescription}</p>
        <div className="mt-2">
          <TrackRow label="Logistics" value={rfq.logisticsLabel} />
          <TrackRow label="Needed back by" value={trackDateLabel(rfq.neededBackBy)} />
          <TrackRow
            label="Customer budget"
            value={rfq.budgetLimit === null ? "" : trackFormatMoney(rfq.budgetLimit)}
            hideEmpty
          />
        </div>
        {rfq.failurePhotos.length ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {rfq.failurePhotos.map((url) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt="Failure photo"
                    className="h-24 w-24 rounded-lg border border-border object-cover"
                  />
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </TrackCard>

      {rfq.updateNotes.length ? (
        <TrackCard title="Updates from the customer">
          <ul className="space-y-2">
            {rfq.updateNotes.map((entry, index) => (
              <li key={index} className="rounded-lg border border-border bg-bg p-2.5">
                <p className="text-[10px] text-secondary">{trackDateLabel(entry.at)}</p>
                <p className="mt-0.5 whitespace-pre-line text-sm text-title">{entry.note}</p>
                {entry.photos.length ? (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {entry.photos.map((url) => (
                      <li key={url}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-primary underline"
                        >
                          Photo
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </TrackCard>
      ) : null}

      {rfq.motorPhotos.length ? (
        <TrackCard title="Motor photos">
          <ul className="flex flex-wrap gap-2">
            {rfq.motorPhotos.map((url) => (
              <li key={url}>
                <a href={url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt="Motor photo"
                    className="h-28 w-28 rounded-lg border border-border object-cover"
                  />
                </a>
              </li>
            ))}
          </ul>
        </TrackCard>
      ) : null}

      {rfq.motorGroups.map((group) => (
        <TrackCard key={group.id} title={group.label}>
          {group.rows.map((row) => (
            <TrackRow key={row.key} label={row.label} value={row.value} />
          ))}
        </TrackCard>
      ))}

      {rfq.datasheetGroups.length ? (
        <TrackCard title="Datasheet shared by the customer">
          {rfq.datasheetProvenance ? (
            <p className="mb-2 text-xs text-secondary">{rfq.datasheetProvenance}</p>
          ) : null}
          {rfq.datasheetGroups.map((group) => (
            <div key={group.blockKey} className="mb-3 last:mb-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-secondary">
                {group.blockLabel}
              </p>
              {group.rows.map((row) => (
                <TrackRow key={row.path} label={row.label} value={row.value} />
              ))}
              {group.notes ? <p className="mt-1 text-xs text-secondary">{group.notes}</p> : null}
            </div>
          ))}
        </TrackCard>
      ) : null}

      {rfq.serviceHistory.length ? (
        <TrackCard title="Past repairs on this motor">
          <ul className="space-y-2">
            {rfq.serviceHistory.map((entry, index) => (
              <li key={index} className="rounded-lg border border-border bg-bg p-2.5">
                <p className="text-xs font-bold text-title">
                  {WORK_TYPE_LABEL[entry.workType] || entry.workType || "Service"}
                </p>
                <p className="text-[10px] text-secondary">{trackDateLabel(entry.completedAt)}</p>
                {entry.failureCause ? (
                  <p className="mt-1 text-xs text-secondary">Cause: {entry.failureCause}</p>
                ) : null}
                {entry.description ? (
                  <p className="mt-1 text-xs text-secondary">{entry.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-secondary">
            Prices from other shops are never shared.
          </p>
        </TrackCard>
      ) : null}

      {readOnly ? null : (
        <>
          <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setMode("propose")}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
                mode === "propose" ? "bg-primary text-white" : "text-secondary"
              }`}
            >
              Send a proposal
            </button>
            <button
              type="button"
              onClick={() => setMode("decline")}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
                mode === "decline" ? "bg-primary text-white" : "text-secondary"
              }`}
            >
              Decline to quote
            </button>
          </div>

          {mode === "propose" ? (
            <TrackCard title={rfq.response ? "Revise your proposal" : "Your proposal"}>
              {rfq.response ? (
                <p className="mb-3 text-xs text-secondary">
                  You already sent version {rfq.response.version} at{" "}
                  {trackFormatMoney(rfq.response.totalPrice, rfq.response.currency)}. Sending again adds a new
                  version, and the customer keeps the history.
                </p>
              ) : null}
              <Form id="track-shop-proposal" onSubmit={submitProposal} className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Total price"
                  name="totalPrice"
                  type="number"
                  value={form.totalPrice}
                  onChange={setField("totalPrice")}
                  required
                />
                <Input
                  label="Currency"
                  name="currency"
                  value={form.currency}
                  onChange={setField("currency")}
                  maxLength={3}
                />
                <Select
                  label="Price basis"
                  name="priceBasis"
                  value={form.priceBasis}
                  onChange={setField("priceBasis")}
                  options={TRACK_PRICE_BASIS_OPTIONS}
                  required
                />
                <Input
                  label="Teardown / inspection fee"
                  name="teardownFee"
                  type="number"
                  value={form.teardownFee}
                  onChange={setField("teardownFee")}
                />
                <Input
                  label="Turnaround (working days)"
                  name="turnaroundDays"
                  type="number"
                  value={form.turnaroundDays}
                  onChange={setField("turnaroundDays")}
                  required
                />
                <Input
                  label="Price valid until"
                  name="validUntil"
                  type="date"
                  value={form.validUntil}
                  onChange={setField("validUntil")}
                  required
                />
                <Input
                  label="Warranty (months)"
                  name="warrantyMonths"
                  type="number"
                  value={form.warrantyMonths}
                  onChange={setField("warrantyMonths")}
                />
                <Input
                  label="Warranty coverage"
                  name="warrantyCoverage"
                  value={form.warrantyCoverage}
                  onChange={setField("warrantyCoverage")}
                />
                <div className="sm:col-span-2">
                  <Checkbox
                    label="Pickup and delivery are included in my price"
                    checked={form.logisticsIncluded}
                    onChange={setField("logisticsIncluded")}
                  />
                </div>
                {!form.logisticsIncluded ? (
                  <Input
                    label="Logistics cost"
                    name="logisticsCost"
                    type="number"
                    value={form.logisticsCost}
                    onChange={setField("logisticsCost")}
                  />
                ) : null}
                <div className="sm:col-span-2">
                  <Textarea
                    label="Scope of work"
                    rows={4}
                    value={form.scopeSummary}
                    onChange={setField("scopeSummary")}
                    placeholder="Strip and clean, rewind stator, replace both bearings, dynamic balance, final test report."
                  />
                </div>
                <div className="sm:col-span-2">
                  <Textarea
                    label="Notes for the customer"
                    rows={3}
                    value={form.notes}
                    onChange={setField("notes")}
                  />
                </div>
                <p className="text-xs text-secondary sm:col-span-2">
                  Winding and test data recorded on this motor belongs to the plant, so it travels with the
                  motor. Pricing is never shared with other shops.
                </p>
                <div className="sm:col-span-2">
                  <Button type="submit" form="track-shop-proposal" disabled={busy} className="w-full">
                    {busy ? "Sending…" : "Send proposal to the customer"}
                  </Button>
                </div>
              </Form>
            </TrackCard>
          ) : (
            <TrackCard title="Decline to quote">
              <Form id="track-shop-decline" onSubmit={submitDecline} className="space-y-3">
                <Select
                  label="Reason"
                  name="declineReason"
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  options={TRACK_DECLINE_REASONS}
                  placeholder="Select a reason"
                  required
                />
                <Textarea
                  label="Anything else the customer should know"
                  rows={3}
                  value={declineNote}
                  onChange={(e) => setDeclineNote(e.target.value)}
                />
                <Button type="submit" form="track-shop-decline" disabled={busy} className="w-full">
                  {busy ? "Sending…" : "Send my reply"}
                </Button>
              </Form>
            </TrackCard>
          )}
        </>
      )}

      <p className="pb-6 text-center text-xs text-secondary">
        This link was sent only to your shop. Do not forward it.
      </p>
    </div>
  );
}
