"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiEye, FiFileText, FiSend, FiXCircle } from "react-icons/fi";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import Checkbox from "@/components/ui/checkbox";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import Select from "@/components/ui/select";
import Table from "@/components/ui/table";
import Textarea from "@/components/ui/textarea";
import { Form } from "@/components/ui/form-layout";
import { useConfirm } from "@/components/confirm-provider";
import { useToast } from "@/components/toast-provider";
import {
  SIMPLE_SCREEN_FILTERS_CLASS,
  SIMPLE_SCREEN_PANEL_CLASS,
  SIMPLE_SCREEN_TABLE_WRAP_CLASS,
} from "@/lib/simple-screen-ui";
import {
  TRACK_DECLINE_REASONS,
  TRACK_PRICE_BASIS_OPTIONS,
  trackFormatMoney,
} from "@/lib/track-rfq";

const LEAD_STATUS_LABEL = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  won: "Won",
  lost: "Lost",
};

const LEAD_STATUS_VARIANT = {
  new: "primary",
  contacted: "warning",
  quoted: "primary",
  won: "success",
  lost: "danger",
};

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "quoted", label: "Quoted" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

const WORK_TYPE_LABEL = {
  rewind: "Rewind",
  bearing_replacement: "Bearing replacement",
  mechanical: "Mechanical",
  testing: "Testing",
  field_service: "Field service",
  other: "Other",
};

const emptySendForm = () => ({
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
  shareLineItems: false,
  shareAttachments: false,
});

function dateLabel(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return "";
  }
}

function Row({ label, value }) {
  const text = value === null || value === undefined || String(value).trim() === "" ? "" : String(value);
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 py-1.5 last:border-b-0">
      <span className="shrink-0 text-sm text-secondary">{label}</span>
      <span className="min-w-0 break-words text-right text-sm font-semibold text-title">
        {text || "Not provided"}
      </span>
    </div>
  );
}

/**
 * §9.4 / §14 - the shop's view of IQMotorTrack Motor Down RFQs, with Convert to
 * Service Proposal, Decline to Quote and Send Proposal to IQMotorTrack.
 * When `embedded`, renders without the outer Simple screen shell (for Customers → Leads).
 */
export default function TrackRfqsPanel({ embedded = false }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineForm, setDeclineForm] = useState({ reason: "", note: "" });
  const [customerChoices, setCustomerChoices] = useState(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendForm, setSendForm] = useState(emptySendForm());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/dashboard/track-rfqs?${params.toString()}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not load requests");
      setRows(data.items || []);
    } catch (err) {
      toast.error(err.message || "Could not load requests.");
    } finally {
      setLoading(false);
    }
  }, [status, search, toast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      load().catch(() => {});
    }, search ? 350 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const openDetail = async (id) => {
    setDetailOpen(true);
    setDetail(null);
    try {
      const res = await fetch(`/api/dashboard/track-rfqs/${id}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not load the request");
      setDetail(data);
    } catch (err) {
      toast.error(err.message || "Could not load the request.");
      setDetailOpen(false);
    }
  };

  const convert = async (options = {}) => {
    if (!detail?.lead?.id) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/dashboard/track-rfqs/${detail.lead.id}/convert`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });
      const data = await res.json();
      if (res.status === 409 && data?.code === "CUSTOMER_CHOICE") {
        setCustomerChoices(data.candidates || []);
        return;
      }
      if (!res.ok) throw new Error(data?.error || "Could not convert");
      setCustomerChoices(null);
      toast.success(
        data.existing
          ? "Opening the proposal that already exists for this request."
          : `Service proposal ${data.item?.documentNumber || ""} created.`
      );
      await openDetail(detail.lead.id);
      await load();
    } catch (err) {
      toast.error(err.message || "Could not convert.");
    } finally {
      setBusy(false);
    }
  };

  const submitDecline = async (e) => {
    e.preventDefault();
    if (!declineForm.reason) {
      toast.error("Pick a reason.");
      return;
    }
    const ok = await confirm({
      title: "Decline to quote",
      message: "The customer is told you cannot quote this motor. This cannot be undone.",
      confirmLabel: "Decline",
      variant: "danger",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/dashboard/track-rfqs/${detail.lead.id}/decline`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(declineForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not decline");
      toast.success("The customer has been told.");
      setDeclineOpen(false);
      setDeclineForm({ reason: "", note: "" });
      await openDetail(detail.lead.id);
      await load();
    } catch (err) {
      toast.error(err.message || "Could not decline.");
    } finally {
      setBusy(false);
    }
  };

  const submitSend = async (e) => {
    e.preventDefault();
    const proposalId = detail?.lead?.proposal?.id;
    if (!proposalId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/dashboard/simple-service-proposals/${proposalId}/send-to-track`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...sendForm,
          totalPrice: Number(sendForm.totalPrice),
          teardownFee: sendForm.teardownFee === "" ? null : Number(sendForm.teardownFee),
          turnaroundDays: Number(sendForm.turnaroundDays),
          logisticsCost: sendForm.logisticsCost === "" ? null : Number(sendForm.logisticsCost),
          warrantyMonths: sendForm.warrantyMonths === "" ? null : Number(sendForm.warrantyMonths),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not send");
      toast.success(
        data.version > 1
          ? `Revised proposal sent to the customer, version ${data.version}.`
          : "Proposal sent to the customer."
      );
      setSendOpen(false);
      setSendForm(emptySendForm());
      await openDetail(detail.lead.id);
      await load();
    } catch (err) {
      toast.error(err.message || "Could not send.");
    } finally {
      setBusy(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "actions",
        label: "Actions",
        sortable: false,
        render: (_value, row) => (
          <button
            type="button"
            onClick={() => openDetail(row.id)}
            aria-label="View request"
            className="rounded-md p-1.5 text-primary hover:bg-primary/10"
          >
            <FiEye className="h-4 w-4" />
          </button>
        ),
      },
      {
        key: "source",
        label: "Source",
        sortable: false,
        render: () => (
          <Badge variant="primary" className="rounded-full px-2.5 py-0.5 text-xs">
            From IQMotorTrack
          </Badge>
        ),
      },
      { key: "reference", label: "Reference" },
      { key: "company", label: "Customer" },
      { key: "motorSummary", label: "Motor" },
      { key: "serialNumber", label: "Serial number" },
      {
        key: "urgencyLevel",
        label: "Urgency",
        render: (value) => (
          <Badge
            variant={String(value).toLowerCase() === "emergency" ? "danger" : "default"}
            className="rounded-full px-2.5 py-0.5 text-xs"
          >
            {value || "Standard"}
          </Badge>
        ),
      },
      {
        key: "status",
        label: "Status",
        render: (value) => (
          <Badge
            variant={LEAD_STATUS_VARIANT[value] || "default"}
            className="rounded-full px-2.5 py-0.5 text-xs"
          >
            {LEAD_STATUS_LABEL[value] || value}
          </Badge>
        ),
      },
      {
        key: "invitedShopCount",
        label: "Competing shops",
        render: (value) => `Sent to ${value || 1}`,
      },
      { key: "createdAt", label: "Received", render: (value) => dateLabel(value) },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const lead = detail?.lead || null;
  const rfqState = detail?.rfq || null;
  const canAct = lead && !rfqState?.cancelled && !rfqState?.notSelected && lead.status !== "lost";

  return (
    <div className={embedded ? "flex min-h-0 flex-1 flex-col overflow-hidden" : SIMPLE_SCREEN_PANEL_CLASS}>
      <div className={`${SIMPLE_SCREEN_FILTERS_CLASS} flex flex-wrap items-end gap-2 px-4 py-3`}>
        <div className="min-w-[12rem] flex-1">
          <Input
            label="Search"
            name="track-rfq-search"
            placeholder="Customer, motor, serial or reference"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="min-w-[10rem]">
          <Select
            label="Status"
            name="track-rfq-status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={STATUS_FILTER_OPTIONS}
          />
        </div>
      </div>

      <div className={SIMPLE_SCREEN_TABLE_WRAP_CLASS}>
        <Table
          columns={columns}
          data={rows}
          rowKey="id"
          loading={loading}
          stickyHeader
          dense
          emptyMessage="No IQMotorTrack requests yet. Plants that pick your shop appear here."
        />
      </div>

      <Modal
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setCustomerChoices(null);
        }}
        title={lead ? `${lead.motorTitle} for ${lead.company}` : "Motor down request"}
        size="xl"
        actions={
          lead ? (
            <>
              {canAct && !lead.proposal ? (
                <>
                  <Button type="button" size="sm" variant="outline" onClick={() => setDeclineOpen(true)}>
                    <FiXCircle className="h-4 w-4 shrink-0" aria-hidden />
                    Decline to quote
                  </Button>
                  <Button type="button" size="sm" disabled={busy} onClick={() => convert()}>
                    <FiFileText className="h-4 w-4 shrink-0" aria-hidden />
                    {busy ? "Working…" : "Convert to Service Proposal"}
                  </Button>
                </>
              ) : null}
              {lead.proposal ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      window.open(
                        `/dashboards?tab=service-proposals&open=${encodeURIComponent(lead.proposal.id)}`,
                        "_blank"
                      )
                    }
                  >
                    Open Service Proposal
                  </Button>
                  {canAct ? (
                    <Button type="button" size="sm" onClick={() => setSendOpen(true)}>
                      <FiSend className="h-4 w-4 shrink-0" aria-hidden />
                      {rfqState?.responseVersion ? "Send revised proposal" : "Send Proposal to IQMotorTrack"}
                    </Button>
                  ) : null}
                </>
              ) : null}
            </>
          ) : null
        }
      >
        {!lead ? (
          <p className="text-sm text-secondary">Loading the request…</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="primary" className="rounded-full px-2.5 py-0.5 text-xs">
                From IQMotorTrack
              </Badge>
              <Badge
                variant={String(lead.urgencyLevel).toLowerCase() === "emergency" ? "danger" : "default"}
                className="rounded-full px-2.5 py-0.5 text-xs"
              >
                {lead.urgencyLevel || "Standard"}
              </Badge>
              <Badge
                variant={LEAD_STATUS_VARIANT[lead.status] || "default"}
                className="rounded-full px-2.5 py-0.5 text-xs"
              >
                {LEAD_STATUS_LABEL[lead.status] || lead.status}
              </Badge>
              <Badge variant="default" className="rounded-full px-2.5 py-0.5 text-xs">
                Sent to {lead.invitedShopCount || 1} shops
              </Badge>
              {rfqState?.awarded ? (
                <Badge variant="success" className="rounded-full px-2.5 py-0.5 text-xs">
                  Awarded by customer on {dateLabel(rfqState.awardedAt)}
                </Badge>
              ) : null}
              {rfqState?.notSelected ? (
                <Badge variant="default" className="rounded-full px-2.5 py-0.5 text-xs">
                  Not selected
                </Badge>
              ) : null}
              {rfqState?.cancelled ? (
                <Badge variant="danger" className="rounded-full px-2.5 py-0.5 text-xs">
                  Cancelled by customer
                </Badge>
              ) : null}
              {rfqState?.responseVersion ? (
                <Badge variant="primary" className="rounded-full px-2.5 py-0.5 text-xs">
                  Proposal sent, version {rfqState.responseVersion}
                </Badge>
              ) : null}
            </div>

            {customerChoices ? (
              <div className="rounded-xl border border-warning/40 bg-warning/10 p-3">
                <p className="text-sm text-title">
                  We found customers that look like {lead.company}. Pick the right one, or create a new
                  customer.
                </p>
                <ul className="mt-2 space-y-1.5">
                  {customerChoices.map((row) => (
                    <li key={row.id} className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-sm text-title">
                        {row.companyName}
                        {row.email ? ` · ${row.email}` : ""}
                        {row.city ? ` · ${row.city}` : ""}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        onClick={() => convert({ customerId: row.id })}
                      >
                        Use this customer
                      </Button>
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  disabled={busy}
                  onClick={() => convert({ createCustomer: true })}
                >
                  Create a new customer
                </Button>
              </div>
            ) : null}

            <section className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-2 font-bold text-title">What happened</h3>
              <p className="whitespace-pre-line text-sm text-title">{lead.problemDescription}</p>
              <div className="mt-2">
                <Row label="Logistics" value={lead.logisticsLabel} />
                <Row label="Needed back by" value={dateLabel(lead.neededBackBy)} />
                <Row
                  label="Customer budget"
                  value={lead.budgetLimit === null ? "" : trackFormatMoney(lead.budgetLimit)}
                />
              </div>
              {lead.photos.length ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {lead.photos.map((url) => (
                    <li key={url}>
                      <a href={url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt="Motor photo"
                          className="h-24 w-24 rounded-lg border border-border object-cover"
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

            <section className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-2 font-bold text-title">Customer contact</h3>
              <Row label="Facility" value={lead.company} />
              <Row label="Contact" value={lead.contactName} />
              <Row label="Email" value={lead.email} />
              <Row label="Phone" value={lead.phone} />
              <Row
                label="Address"
                value={[lead.address, lead.city, lead.state, lead.zipCode, lead.country]
                  .filter(Boolean)
                  .join(", ")}
              />
            </section>

            {lead.motorGroups.map((group) => (
              <section key={group.id} className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-2 font-bold text-title">{group.label}</h3>
                {group.rows.map((row) => (
                  <Row key={row.key} label={row.label} value={row.value} />
                ))}
              </section>
            ))}

            {lead.datasheetPowerConflict ? (
              <div className="rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-title">
                The customer&apos;s datasheet was recorded as {lead.datasheetPowerType}, but this motor is
                registered as {lead.motorPowerType}. Nothing is pre-filled. Check both values before you
                quote.
              </div>
            ) : null}

            {lead.datasheetGroups.length ? (
              <section className="rounded-xl border border-border bg-card p-4">
                <h3 className="font-bold text-title">Datasheet from IQMotorTrack</h3>
                {lead.datasheetProvenance ? (
                  <p className="mt-0.5 text-xs text-secondary">{lead.datasheetProvenance}</p>
                ) : null}
                <div className="mt-2 space-y-3">
                  {lead.datasheetGroups.map((group) => (
                    <div key={group.blockKey}>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-secondary">
                        {group.blockLabel}
                      </p>
                      {group.rows.map((row) => (
                        <Row key={row.path} label={row.label} value={row.value} />
                      ))}
                      {group.notes ? <p className="mt-1 text-xs text-secondary">{group.notes}</p> : null}
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-secondary">
                  Converting pre-fills your {lead.motorPowerType} datasheet with these values, marked as
                  coming from IQMotorTrack. You can accept or correct each one.
                </p>
              </section>
            ) : null}

            {lead.serviceHistory.length ? (
              <section className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-2 font-bold text-title">Past repairs on this motor</h3>
                <ul className="space-y-2">
                  {lead.serviceHistory.map((entry, index) => (
                    <li key={index} className="rounded-lg border border-border bg-bg p-2.5">
                      <p className="text-sm font-bold text-title">
                        {WORK_TYPE_LABEL[entry.workType] || entry.workType || "Service"}
                      </p>
                      <p className="text-xs text-secondary">{dateLabel(entry.completedAt)}</p>
                      {entry.failureCause ? (
                        <p className="mt-1 text-xs text-secondary">Cause: {entry.failureCause}</p>
                      ) : null}
                      {entry.description ? (
                        <p className="mt-1 text-xs text-secondary">{entry.description}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-secondary">
                  Other shops&apos; prices are never shared with you.
                </p>
              </section>
            ) : null}

            {lead.proposal ? (
              <section className="rounded-xl border border-border bg-card p-4">
                <h3 className="mb-2 font-bold text-title">Linked Service Proposal</h3>
                <Row label="Document number" value={lead.proposal.documentNumber} />
                <Row label="Record type" value={lead.proposal.recordType} />
                <Row label="Status" value={lead.proposal.status} />
                <Row label="Job status" value={lead.proposal.jobStatus} />
                <p className="mt-2 text-xs text-secondary">
                  Saving the proposal does not send anything to the customer. Use Send Proposal to
                  IQMotorTrack when you are ready.
                </p>
              </section>
            ) : null}

            {lead.declineReason ? (
              <div className="rounded-xl border border-border bg-card p-3 text-sm text-secondary">
                You declined this request: {lead.declineReason}
              </div>
            ) : null}
          </div>
        )}
      </Modal>

      <Modal
        open={declineOpen}
        onClose={() => setDeclineOpen(false)}
        title="Decline to quote"
        size="sm"
        actions={
          <>
            <Button type="button" size="sm" variant="outline" onClick={() => setDeclineOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="track-decline-form" size="sm" variant="danger" disabled={busy}>
              {busy ? "Sending…" : "Decline"}
            </Button>
          </>
        }
      >
        <Form id="track-decline-form" onSubmit={submitDecline} className="space-y-3">
          <Select
            label="Reason"
            name="reason"
            value={declineForm.reason}
            onChange={(e) => setDeclineForm((prev) => ({ ...prev, reason: e.target.value }))}
            options={TRACK_DECLINE_REASONS}
            placeholder="Select a reason"
          />
          <Textarea
            label="Anything else the customer should know"
            rows={3}
            value={declineForm.note}
            onChange={(e) => setDeclineForm((prev) => ({ ...prev, note: e.target.value }))}
          />
        </Form>
      </Modal>

      <Modal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        title="Send proposal to IQMotorTrack"
        size="lg"
        actions={
          <>
            <Button type="button" size="sm" variant="outline" onClick={() => setSendOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="track-send-form" size="sm" disabled={busy}>
              {busy ? "Sending…" : "Send to customer"}
            </Button>
          </>
        }
      >
        <Form id="track-send-form" onSubmit={submitSend} className="grid gap-3 sm:grid-cols-2">
          <p className="text-sm text-secondary sm:col-span-2">
            Confirm exactly what the customer will see. Price, price basis, turnaround and the valid-until
            date are always shared. Everything else is optional.
          </p>
          <Input
            label="Total price"
            name="totalPrice"
            type="number"
            value={sendForm.totalPrice}
            onChange={(e) => setSendForm((prev) => ({ ...prev, totalPrice: e.target.value }))}
            required
          />
          <Input
            label="Currency"
            name="currency"
            maxLength={3}
            value={sendForm.currency}
            onChange={(e) => setSendForm((prev) => ({ ...prev, currency: e.target.value }))}
          />
          <Select
            label="Price basis"
            name="priceBasis"
            value={sendForm.priceBasis}
            onChange={(e) => setSendForm((prev) => ({ ...prev, priceBasis: e.target.value }))}
            options={TRACK_PRICE_BASIS_OPTIONS}
          />
          <Input
            label="Turnaround (working days)"
            name="turnaroundDays"
            type="number"
            value={sendForm.turnaroundDays}
            onChange={(e) => setSendForm((prev) => ({ ...prev, turnaroundDays: e.target.value }))}
            required
          />
          <Input
            label="Price valid until"
            name="validUntil"
            type="date"
            value={sendForm.validUntil}
            onChange={(e) => setSendForm((prev) => ({ ...prev, validUntil: e.target.value }))}
            required
          />
          <Input
            label="Teardown / inspection fee"
            name="teardownFee"
            type="number"
            value={sendForm.teardownFee}
            onChange={(e) => setSendForm((prev) => ({ ...prev, teardownFee: e.target.value }))}
          />
          <Input
            label="Warranty (months)"
            name="warrantyMonths"
            type="number"
            value={sendForm.warrantyMonths}
            onChange={(e) => setSendForm((prev) => ({ ...prev, warrantyMonths: e.target.value }))}
          />
          <Input
            label="Warranty coverage"
            name="warrantyCoverage"
            value={sendForm.warrantyCoverage}
            onChange={(e) => setSendForm((prev) => ({ ...prev, warrantyCoverage: e.target.value }))}
          />
          <div className="sm:col-span-2">
            <Checkbox
              label="Pickup and delivery are included in my price"
              checked={sendForm.logisticsIncluded}
              onChange={(e) =>
                setSendForm((prev) => ({ ...prev, logisticsIncluded: e.target.checked }))
              }
            />
          </div>
          {!sendForm.logisticsIncluded ? (
            <Input
              label="Logistics cost"
              name="logisticsCost"
              type="number"
              value={sendForm.logisticsCost}
              onChange={(e) => setSendForm((prev) => ({ ...prev, logisticsCost: e.target.value }))}
            />
          ) : null}
          <div className="sm:col-span-2">
            <Textarea
              label="Scope of work"
              rows={4}
              value={sendForm.scopeSummary}
              onChange={(e) => setSendForm((prev) => ({ ...prev, scopeSummary: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <Textarea
              label="Notes for the customer"
              rows={3}
              value={sendForm.notes}
              onChange={(e) => setSendForm((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Checkbox
              label="Share my itemised lines with the customer"
              checked={sendForm.shareLineItems}
              onChange={(e) => setSendForm((prev) => ({ ...prev, shareLineItems: e.target.checked }))}
            />
            <Checkbox
              label="Share the attachments on this proposal"
              checked={sendForm.shareAttachments}
              onChange={(e) => setSendForm((prev) => ({ ...prev, shareAttachments: e.target.checked }))}
            />
            <p className="text-xs text-secondary">
              Winding and test data recorded on this motor belongs to the plant and travels with the motor.
              Your pricing is never shown to competing shops.
            </p>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
