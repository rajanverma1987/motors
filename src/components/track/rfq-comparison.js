"use client";

import { useEffect, useState } from "react";
import { FiAward, FiClock, FiRefreshCw, FiTag, FiUserPlus, FiXCircle } from "react-icons/fi";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import Textarea from "@/components/ui/textarea";
import { Form } from "@/components/ui/form-layout";
import { useConfirm } from "@/components/confirm-provider";
import { useToast } from "@/components/toast-provider";
import {
  TRACK_INVITATION_STATUS_LABEL,
  TRACK_INVITATION_STATUS_VARIANT,
  TRACK_LOGISTICS_LABEL,
  TRACK_PRICE_BASIS_LABEL,
  TRACK_RFQ_STATUS_LABEL,
  TRACK_RFQ_STATUS_VARIANT,
  trackFormatMoney,
} from "@/lib/track-rfq";
import { trackMotorTitle } from "@/lib/track-motor-fields";
import { appFetch } from "./api";
import { useTrackAuth } from "./auth-context";
import TrackPhotoInput from "./photo-input";
import { TrackCard, TrackEmpty, TrackRow, TrackScreen, trackDateLabel } from "./ui";

function ProposalCard({ rfq, invitation, onAward, awarding }) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const response = invitation.response;
  const expired = Boolean(response?.expired);
  const isCheapest = rfq.cheapestIds?.includes(invitation.id);
  const isFastest = rfq.fastestIds?.includes(invitation.id);
  const isAwarded = rfq.awardedInvitationId === invitation.id;

  return (
    <li
      className={`rounded-2xl border p-3 ${
        isAwarded
          ? "border-success bg-success/5"
          : expired
            ? "border-border bg-card opacity-60"
            : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-title">{invitation.shopName || "Shop"}</p>
          <p className="mt-0.5 text-[11px] text-secondary">
            {[invitation.shopCity, invitation.shopState].filter(Boolean).join(", ") || "Location not listed"}
            {invitation.distanceLabel ? ` · ${invitation.distanceLabel}` : ""}
          </p>
        </div>
        <Badge
          variant={TRACK_INVITATION_STATUS_VARIANT[invitation.status] || "default"}
          className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px]"
        >
          {TRACK_INVITATION_STATUS_LABEL[invitation.status] || invitation.status}
        </Badge>
      </div>

      <div className="mt-1.5 flex flex-wrap gap-1">
        {invitation.servicedBefore ? (
          <Badge variant="success" className="rounded-full px-2 py-0.5 text-[10px]">
            Serviced this motor before
          </Badge>
        ) : null}
        {invitation.shopRating ? (
          <Badge variant="default" className="rounded-full px-2 py-0.5 text-[10px]">
            {invitation.shopRating} ★
          </Badge>
        ) : null}
        <Badge
          variant={invitation.respondsBy === "in_app" ? "primary" : "default"}
          className="rounded-full px-2 py-0.5 text-[10px]"
        >
          {invitation.respondsBy === "in_app" ? "Responds in app" : "Responds by email"}
        </Badge>
        {isCheapest && !expired ? (
          <Badge variant="success" className="rounded-full px-2 py-0.5 text-[10px]">
            <FiTag className="mr-1 h-3 w-3 shrink-0" aria-hidden />
            Lowest for this price basis
          </Badge>
        ) : null}
        {isFastest && !expired ? (
          <Badge variant="primary" className="rounded-full px-2 py-0.5 text-[10px]">
            <FiClock className="mr-1 h-3 w-3 shrink-0" aria-hidden />
            Fastest for this price basis
          </Badge>
        ) : null}
        {expired ? (
          <Badge variant="warning" className="rounded-full px-2 py-0.5 text-[10px]">
            Expired
          </Badge>
        ) : null}
      </div>

      {invitation.deliveryStatus !== "sent" ? (
        <p className="mt-2 rounded-lg border border-warning/40 bg-warning/10 p-2 text-[11px] text-title">
          {invitation.deliveryStatus === "failed"
            ? invitation.deliveryError || "Delivery failed. It will retry."
            : "Sending…"}
        </p>
      ) : null}

      {invitation.status === "declined" ? (
        <p className="mt-2 text-[11px] text-secondary">
          Declined: {invitation.declineReason || "No reason given"}
        </p>
      ) : null}

      {response ? (
        <div className="mt-2">
          <TrackRow label="Total price" value={trackFormatMoney(response.totalPrice, response.currency)} />
          <TrackRow label="Price basis" value={TRACK_PRICE_BASIS_LABEL[response.priceBasis] || ""} />
          <TrackRow
            label="Teardown / inspection fee"
            value={
              response.teardownFee === null
                ? ""
                : trackFormatMoney(response.teardownFee, response.currency)
            }
          />
          <TrackRow
            label="Turnaround"
            value={response.turnaroundDays ? `${response.turnaroundDays} working days` : ""}
          />
          <TrackRow label="Promised ready date" value={trackDateLabel(response.promisedReadyDate)} />
          <TrackRow label="Scope summary" value={response.scopeSummary} />
          <TrackRow
            label="Logistics"
            value={
              response.logisticsIncluded
                ? "Pickup and delivery included"
                : response.logisticsCost === null
                  ? ""
                  : `Not included, ${trackFormatMoney(response.logisticsCost, response.currency)}`
            }
          />
          <TrackRow
            label="Warranty"
            value={
              response.warrantyMonths
                ? `${response.warrantyMonths} months${response.warrantyCoverage ? `, ${response.warrantyCoverage}` : ""}`
                : response.warrantyCoverage
            }
          />
          <TrackRow label="Valid until" value={trackDateLabel(response.validUntil)} />
          <TrackRow label="Notes" value={response.notes} />

          {Array.isArray(response.lineItems) && response.lineItems.length ? (
            <div className="mt-2 rounded-lg border border-border bg-bg p-2">
              <p className="text-[10px] font-bold uppercase tracking-wide text-secondary">Shared line items</p>
              <ul className="mt-1 space-y-0.5">
                {response.lineItems.map((item, index) => (
                  <li key={index} className="flex justify-between gap-2 text-[11px] text-title">
                    <span className="min-w-0 truncate">{item?.description || item?.name || "Item"}</span>
                    <span className="shrink-0">
                      {item?.amount === undefined || item?.amount === null
                        ? "Not provided"
                        : trackFormatMoney(item.amount, response.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {response.attachments?.length ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {response.attachments.map((url) => (
                <li key={url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-semibold text-primary underline"
                  >
                    Attachment
                  </a>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-3 flex items-center gap-2">
            {rfq.status === "open" ? (
              <Button
                type="button"
                size="sm"
                disabled={expired || awarding}
                onClick={() => onAward(invitation)}
                className="flex-1"
              >
                <FiAward className="h-4 w-4 shrink-0" aria-hidden />
                Award
              </Button>
            ) : null}
            {invitation.responseHistory.length ? (
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                className="rounded-md px-2 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10"
              >
                Earlier versions ({invitation.responseHistory.length})
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-secondary">
          {invitation.status === "declined" ? "No proposal." : "No proposal yet."}
        </p>
      )}

      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={`${invitation.shopName || "Shop"} proposal history`}
        size="md"
      >
        <ul className="space-y-2">
          {invitation.responseHistory
            .slice()
            .reverse()
            .map((version) => (
              <li key={version.version} className="rounded-xl border border-border bg-bg p-3">
                <p className="text-xs font-bold text-title">Version {version.version}</p>
                <TrackRow label="Total" value={trackFormatMoney(version.totalPrice, version.currency)} />
                <TrackRow label="Price basis" value={TRACK_PRICE_BASIS_LABEL[version.priceBasis] || ""} />
                <TrackRow
                  label="Turnaround"
                  value={version.turnaroundDays ? `${version.turnaroundDays} working days` : ""}
                />
                <TrackRow label="Received" value={trackDateLabel(version.receivedAt)} />
              </li>
            ))}
        </ul>
      </Modal>
    </li>
  );
}

/**
 * §8 - proposal comparison and award for one RFQ Request.
 */
export default function TrackRfqComparison({ rfqId, onBack, onChanged }) {
  const confirm = useConfirm();
  const toast = useToast();
  const { token, session } = useTrackAuth();
  const [rfq, setRfq] = useState(null);
  const [motor, setMotor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [awarding, setAwarding] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [updateForm, setUpdateForm] = useState({ note: "", photos: [] });
  const [shops, setShops] = useState([]);
  const [inviteSelected, setInviteSelected] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await appFetch(`/api/track/rfqs/${rfqId}`, { token });
      setRfq(data.rfq || null);
      setMotor(data.motor || null);
    } catch (err) {
      toast.error(err.message || "Could not load the RFQ.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfqId, token]);

  const award = async (invitation) => {
    const response = invitation.response;
    const ok = await confirm({
      title: "Award this job",
      message: `Award ${invitation.shopName} at ${trackFormatMoney(
        response.totalPrice,
        response.currency
      )} (${TRACK_PRICE_BASIS_LABEL[response.priceBasis] || response.priceBasis}), ${
        response.turnaroundDays ? `${response.turnaroundDays} working days` : "turnaround not provided"
      }? Every other invited shop is told the RFQ is closed, without your price or the winner.`,
      confirmLabel: "Award",
    });
    if (!ok) return;
    setAwarding(true);
    try {
      const data = await appFetch(`/api/track/rfqs/${rfqId}/award`, {
        token,
        method: "POST",
        body: { invitationId: invitation.id },
      });
      setRfq(data.rfq);
      toast.success(`Awarded to ${invitation.shopName}.`);
      onChanged?.();
    } catch (err) {
      toast.error(err.message || "Could not award.");
    } finally {
      setAwarding(false);
    }
  };

  const unaward = async () => {
    const ok = await confirm({
      title: "Undo the award",
      message: "This is only possible before the shop starts the job. The shop is put back to quoted.",
      confirmLabel: "Undo award",
      variant: "danger",
    });
    if (!ok) return;
    try {
      const data = await appFetch(`/api/track/rfqs/${rfqId}/award`, { token, method: "DELETE" });
      setRfq(data.rfq);
      toast.success("Award undone.");
      onChanged?.();
    } catch (err) {
      toast.error(err.message || "Could not undo the award.");
    }
  };

  const cancel = async () => {
    const first = await confirm({
      title: "Cancel this RFQ",
      message: "Every invited shop is told it was cancelled. Linked proposals are marked cancelled, not deleted.",
      confirmLabel: "Continue",
      variant: "danger",
    });
    if (!first) return;
    const second = await confirm({
      title: "Confirm cancellation",
      message: "This cannot be undone. Cancel the RFQ?",
      confirmLabel: "Cancel RFQ",
      variant: "danger",
    });
    if (!second) return;
    try {
      const data = await appFetch(`/api/track/rfqs/${rfqId}/cancel`, {
        token,
        method: "POST",
        body: { reason: "Cancelled by customer" },
      });
      setRfq(data.rfq);
      toast.success("RFQ cancelled.");
      onChanged?.();
    } catch (err) {
      toast.error(err.message || "Could not cancel.");
    }
  };

  const returnToService = async () => {
    const ok = await confirm({
      title: "Return the motor to service",
      message: "This sets the motor back to Running, closes the RFQ, and recalculates maintenance due dates.",
      confirmLabel: "Return to service",
    });
    if (!ok) return;
    try {
      const data = await appFetch(`/api/track/rfqs/${rfqId}/return-to-service`, { token, method: "POST" });
      setRfq(data.rfq);
      toast.success("Motor is back in service.");
      onChanged?.();
    } catch (err) {
      toast.error(err.message || "Could not close the RFQ.");
    }
  };

  const retryDelivery = async () => {
    try {
      const data = await appFetch(`/api/track/rfqs/${rfqId}/retry-delivery`, { token, method: "POST" });
      setRfq(data.rfq);
      const failed = (data.deliveries || []).filter((d) => !d.ok);
      if (failed.length) toast.error("Some shops still could not be reached.");
      else toast.success("Delivery retried.");
    } catch (err) {
      toast.error(err.message || "Could not retry.");
    }
  };

  const submitUpdate = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const data = await appFetch(`/api/track/rfqs/${rfqId}/update`, {
        token,
        method: "POST",
        body: updateForm,
      });
      setRfq(data.rfq);
      setUpdateForm({ note: "", photos: [] });
      setUpdateOpen(false);
      toast.success("Invited shops were told about the update.");
    } catch (err) {
      toast.error(err.message || "Could not send the update.");
    } finally {
      setBusy(false);
    }
  };

  const openInvite = async () => {
    setInviteOpen(true);
    setInviteSelected([]);
    try {
      const params = new URLSearchParams({
        motorId: rfq.motorId,
        urgency: rfq.urgency,
        logistics: rfq.logistics,
      });
      const data = await appFetch(`/api/track/shops?${params.toString()}`, { token });
      const invited = new Set(rfq.invitations.map((i) => i.listingId));
      setShops((data.shops || []).filter((shop) => !invited.has(shop.id)));
    } catch (err) {
      toast.error(err.message || "Could not load shops.");
    }
  };

  const submitInvite = async () => {
    if (inviteSelected.length === 0) {
      toast.error("Select at least one shop.");
      return;
    }
    setBusy(true);
    try {
      const data = await appFetch(`/api/track/rfqs/${rfqId}/invite`, {
        token,
        method: "POST",
        body: { listingIds: inviteSelected },
      });
      setRfq(data.rfq);
      setInviteOpen(false);
      toast.success("Extra shops invited.");
      onChanged?.();
    } catch (err) {
      toast.error(err.message || "Could not invite.");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <TrackScreen title="RFQ" onBack={onBack}>
        <p className="p-4 text-sm text-secondary">Loading proposals…</p>
      </TrackScreen>
    );
  }

  if (!rfq) {
    return (
      <TrackScreen title="RFQ" onBack={onBack}>
        <div className="p-4">
          <TrackEmpty title="RFQ not found" message="It may have been cancelled." />
        </div>
      </TrackScreen>
    );
  }

  const pendingDelivery = rfq.invitations.some((i) => i.deliveryStatus !== "sent");
  const canEditRfq = rfq.status === "open";

  return (
    <TrackScreen
      title={rfq.reference || "RFQ"}
      subtitle={motor ? trackMotorTitle(motor) : ""}
      onBack={onBack}
    >
      <div className="space-y-3 px-4 pb-8 pt-3">
        <TrackCard>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant={TRACK_RFQ_STATUS_VARIANT[rfq.status] || "default"}
              className="rounded-full px-2.5 py-0.5 text-xs"
            >
              {TRACK_RFQ_STATUS_LABEL[rfq.status] || rfq.status}
            </Badge>
            {rfq.urgency === "emergency" ? (
              <Badge variant="danger" className="rounded-full px-2.5 py-0.5 text-xs">
                Emergency
              </Badge>
            ) : null}
            <Badge variant="primary" className="rounded-full px-2.5 py-0.5 text-xs">
              {rfq.proposalsReceived} of {rfq.invitedCount} responded
            </Badge>
          </div>
          <div className="mt-2">
            <TrackRow label="Sent" value={trackDateLabel(rfq.sentAt)} />
            <TrackRow label="Logistics" value={TRACK_LOGISTICS_LABEL[rfq.logistics]} />
            <TrackRow label="Needed back by" value={trackDateLabel(rfq.neededBackBy)} />
            <TrackRow
              label="Budget shared"
              value={rfq.shareBudget && rfq.budgetLimit ? trackFormatMoney(rfq.budgetLimit) : "Not shared"}
            />
            <TrackRow
              label="Datasheet shared"
              value={rfq.datasheetShared ? rfq.datasheetSnapshotProvenance || "Yes" : "No"}
            />
            <TrackRow label="Awarded shop" value={rfq.awardedShopName} />
          </div>
          <p className="mt-2 whitespace-pre-line text-xs text-title">{rfq.failureDescription}</p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {canEditRfq ? (
              <>
                <Button type="button" size="sm" variant="outline" onClick={() => setUpdateOpen(true)}>
                  Add update
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={openInvite}>
                  <FiUserPlus className="h-4 w-4 shrink-0" aria-hidden />
                  Invite more
                </Button>
              </>
            ) : null}
            {pendingDelivery ? (
              <Button type="button" size="sm" variant="outline" onClick={retryDelivery}>
                <FiRefreshCw className="h-4 w-4 shrink-0" aria-hidden />
                Retry delivery
              </Button>
            ) : null}
            {rfq.status === "awarded" ? (
              <Button type="button" size="sm" variant="outline" onClick={unaward}>
                Undo award
              </Button>
            ) : null}
            {["awarded", "in_repair", "repaired"].includes(rfq.status) ? (
              <Button type="button" size="sm" onClick={returnToService}>
                Confirm return to service
              </Button>
            ) : null}
            {["open", "awarded"].includes(rfq.status) ? (
              <Button type="button" size="sm" variant="outline" onClick={cancel}>
                <FiXCircle className="h-4 w-4 shrink-0" aria-hidden />
                Cancel RFQ
              </Button>
            ) : null}
          </div>
        </TrackCard>

        {rfq.updateNotes.length ? (
          <TrackCard title="Updates sent to shops">
            <ul className="space-y-2">
              {rfq.updateNotes.map((entry, index) => (
                <li key={index} className="rounded-lg border border-border bg-bg p-2">
                  <p className="text-[10px] text-secondary">{trackDateLabel(entry.at)}</p>
                  <p className="mt-0.5 whitespace-pre-line text-xs text-title">{entry.note}</p>
                </li>
              ))}
            </ul>
          </TrackCard>
        ) : null}

        <div>
          <h3 className="mb-2 text-sm font-bold text-title">Proposals</h3>
          <ul className="space-y-2">
            {rfq.invitations.map((invitation) => (
              <ProposalCard
                key={invitation.id}
                rfq={rfq}
                invitation={invitation}
                onAward={award}
                awarding={awarding}
              />
            ))}
          </ul>
        </div>
      </div>

      <Modal
        open={updateOpen}
        onClose={() => setUpdateOpen(false)}
        title="Update invited shops"
        size="md"
        actions={
          <>
            <Button type="button" size="sm" variant="outline" onClick={() => setUpdateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="track-rfq-update-form" size="sm" disabled={busy}>
              {busy ? "Sending…" : "Send update"}
            </Button>
          </>
        }
      >
        <Form id="track-rfq-update-form" onSubmit={submitUpdate} className="space-y-3">
          <Textarea
            label="What changed"
            rows={4}
            value={updateForm.note}
            onChange={(e) => setUpdateForm((prev) => ({ ...prev, note: e.target.value }))}
            placeholder="Corrected HP to 75, added photos of the drive end bearing."
          />
          <TrackPhotoInput
            label="Extra photos"
            multiple
            max={4}
            values={updateForm.photos}
            onChange={(urls) => setUpdateForm((prev) => ({ ...prev, photos: urls }))}
          />
        </Form>
      </Modal>

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite more shops"
        size="md"
        actions={
          <>
            <Button type="button" size="sm" variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={submitInvite} disabled={busy}>
              {busy ? "Inviting…" : "Invite"}
            </Button>
          </>
        }
      >
        <p className="mb-3 text-xs text-secondary">
          New shops receive the original motor snapshot plus every failure update you have posted.
        </p>
        {!session?.isPro ? (
          <p className="mb-3 text-[11px] text-secondary">
            Free plan allows 5 shops per RFQ in total. Pro removes the limit.
          </p>
        ) : null}
        <ul className="space-y-2">
          {shops.map((shop) => (
            <li key={shop.id} className="rounded-xl border border-border bg-bg p-2.5">
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={inviteSelected.includes(shop.id)}
                  onChange={() =>
                    setInviteSelected((prev) =>
                      prev.includes(shop.id) ? prev.filter((id) => id !== shop.id) : [...prev, shop.id]
                    )
                  }
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary"
                />
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-title">{shop.companyName}</p>
                  <p className="text-[10px] text-secondary">
                    {[shop.city, shop.state].filter(Boolean).join(", ")} · {shop.distanceLabel}
                  </p>
                </div>
              </label>
            </li>
          ))}
        </ul>
        {shops.length === 0 ? (
          <p className="text-xs text-secondary">Every matching shop is already invited.</p>
        ) : null}
      </Modal>
    </TrackScreen>
  );
}
