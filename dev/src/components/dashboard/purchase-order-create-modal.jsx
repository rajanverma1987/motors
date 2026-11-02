"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import DataTable from "@/components/ui/data-table";
import { Form, FormSection, FORM_SECTIONS_STACK_CLASS } from "@/components/ui/form-layout";
import VendorAttachmentsPanel from "@/components/dashboard/vendor-attachments-panel";
import PoLineItemsTotalsTable from "@/components/dashboard/po-line-items-totals-table";
import { useToast } from "@/components/toast-provider";
import { useFormatMoney } from "@/contexts/user-settings-context";
import { fetchAllPaginatedDashboardItems } from "@/lib/fetch-all-paginated-dashboard-items";
import {
  PO_LINE_COLUMNS,
  PO_TYPE_OPTIONS,
  INITIAL_PO_FORM,
  buildPurchaseOrderPayload,
} from "@/lib/purchase-order-form-shared";

const CREATE_PO_FORM_ID = "purchase-order-create-form";
const ADD_VENDOR_FORM_ID = "purchase-order-create-add-vendor-form";
const PARTS_SUPPLIED_COLUMNS = [{ key: "item", label: "Part / material" }];

const INITIAL_VENDOR_FORM = {
  name: "",
  contactName: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  partsSupplied: [],
  paymentTerms: "",
  notes: "",
};

function buildVendorPayload(vendorForm) {
  const f = vendorForm || {};
  return {
    name: f.name ?? "",
    contactName: f.contactName ?? "",
    phone: f.phone ?? "",
    email: f.email ?? "",
    address: f.address ?? "",
    city: f.city ?? "",
    state: f.state ?? "",
    zipCode: f.zipCode ?? "",
    partsSupplied: Array.isArray(f.partsSupplied) ? f.partsSupplied : [],
    paymentTerms: f.paymentTerms ?? "",
    notes: f.notes ?? "",
  };
}

function mergeInitialPoForm(initialForm) {
  const base = { ...INITIAL_PO_FORM, lineItems: [], attachments: [] };
  const extra = initialForm && typeof initialForm === "object" ? initialForm : {};
  return {
    ...base,
    ...extra,
    lineItems: Array.isArray(extra.lineItems) ? extra.lineItems.map((row) => ({ ...row })) : [],
    attachments: Array.isArray(extra.attachments) ? [...extra.attachments] : [],
  };
}

/**
 * Shared “Create Purchase Order” modal (same as Procurement → Purchase orders).
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   onCreated?: (po: object) => void,
 *   initialForm?: object,
 * }} props
 */
export default function PurchaseOrderCreateModal({ open, onClose, onCreated, initialForm }) {
  const toast = useToast();
  const fmt = useFormatMoney();
  const [form, setForm] = useState(INITIAL_PO_FORM);
  const formRef = useRef(form);
  formRef.current = form;

  const [vendors, setVendors] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [repairJobs, setRepairJobs] = useState([]);
  const [nextPoNumber, setNextPoNumber] = useState("—");
  const [savingPo, setSavingPo] = useState(false);
  const [pendingPoAttachmentFiles, setPendingPoAttachmentFiles] = useState([]);
  const [attachmentPoUploading, setAttachmentPoUploading] = useState(false);

  const [addVendorModalOpen, setAddVendorModalOpen] = useState(false);
  const [vendorForm, setVendorForm] = useState(INITIAL_VENDOR_FORM);
  const [savingVendor, setSavingVendor] = useState(false);
  const vendorFormRef = useRef(vendorForm);
  vendorFormRef.current = vendorForm;

  const initialFormRef = useRef(initialForm);
  initialFormRef.current = initialForm;

  const loadVendors = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/vendors?page=1&pageSize=1000", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load vendors");
      setVendors(Array.isArray(data?.items) ? data.items : []);
    } catch {
      setVendors([]);
    }
  }, []);

  const loadJobLinkLists = useCallback(async () => {
    try {
      const [qList, jobsRes] = await Promise.all([
        fetchAllPaginatedDashboardItems("/api/dashboard/quotes"),
        fetch("/api/dashboard/repair-flow/jobs", { credentials: "include", cache: "no-store" }).then((r) =>
          r.ok ? r.json() : []
        ),
      ]);
      setQuotes(qList);
      setRepairJobs(Array.isArray(jobsRes) ? jobsRes : []);
    } catch {
      setQuotes([]);
      setRepairJobs([]);
    }
  }, []);

  const loadNextPoNumber = useCallback(async (poForm) => {
    const f = poForm || {};
    try {
      const params = new URLSearchParams();
      if (f.type === "job") {
        params.set("type", "job");
        const qid = String(f.quoteId || "").trim();
        const rjid = String(f.repairFlowJobId || "").trim();
        if (qid) params.set("quoteId", qid);
        if (rjid) params.set("repairFlowJobId", rjid);
      }
      const qs = params.toString();
      const res = await fetch(`/api/dashboard/purchase-orders/next-number${qs ? `?${qs}` : ""}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load PO number");
      setNextPoNumber(data.nextPoNumber || "—");
    } catch {
      setNextPoNumber("—");
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setForm(mergeInitialPoForm(initialFormRef.current));
    setPendingPoAttachmentFiles([]);
    loadVendors();
    loadJobLinkLists();
  }, [open, loadVendors, loadJobLinkLists]);

  useEffect(() => {
    if (!open) return;
    loadNextPoNumber(form);
  }, [open, form.type, form.quoteId, form.repairFlowJobId, loadNextPoNumber]);

  const vendorOptions = useMemo(
    () =>
      vendors.map((v) => ({
        value: v.id,
        label: v.name || v.id || "—",
      })),
    [vendors]
  );

  const jobLinkOptions = useMemo(() => {
    const jobOpts = repairJobs.map((j) => {
      const jn = String(j.jobNumber || "").trim() || String(j.id);
      return {
        value: `job|${j.id}`,
        label: jn,
        ts: new Date(j.createdAt || 0).getTime() || 0,
      };
    });

    const quoteLinkRows = [];
    for (const q of quotes) {
      const qid = String(q?.id ?? "").trim();
      if (!qid) continue;
      const rfq = String(q?.rfqNumber ?? "").trim();
      quoteLinkRows.push({
        value: `quote|${qid}`,
        label: rfq || qid,
        ts: new Date(q?.createdAt || 0).getTime() || 0,
      });
    }

    jobOpts.sort((a, b) => b.ts - a.ts);
    quoteLinkRows.sort((a, b) => b.ts - a.ts);
    const merged = [
      ...jobOpts.map(({ value, label }) => ({ value, label })),
      ...quoteLinkRows.map(({ value, label }) => ({ value, label })),
    ];

    const selJob = String(form.repairFlowJobId ?? "").trim();
    const selQuote = String(form.quoteId ?? "").trim();
    const selVal = selJob ? `job|${selJob}` : selQuote ? `quote|${selQuote}` : "";
    if (!selVal) return merged;
    if (merged.some((o) => o.value === selVal)) return merged;
    if (selJob) {
      return [{ value: `job|${selJob}`, label: selJob }, ...merged];
    }
    return [{ value: `quote|${selQuote}`, label: selQuote }, ...merged];
  }, [repairJobs, quotes, form.repairFlowJobId, form.quoteId]);

  const jobLinkSelectValue = useMemo(() => {
    const j = String(form.repairFlowJobId || "").trim();
    if (j) return `job|${j}`;
    const q = String(form.quoteId || "").trim();
    if (q) return `quote|${q}`;
    return "";
  }, [form.repairFlowJobId, form.quoteId]);

  const handleJobLinkChange = useCallback(
    (e) => {
      const v = String(e.target?.value ?? "");
      if (!v) {
        setForm((f) => ({ ...f, quoteId: "", repairFlowJobId: "" }));
        return;
      }
      if (v.startsWith("job|")) {
        const jid = v.slice(4);
        const q = quotes.find((x) => String(x.repairFlowJobId || "").trim() === jid);
        setForm((f) => ({
          ...f,
          repairFlowJobId: jid,
          quoteId: q?.id ? String(q.id) : "",
        }));
        return;
      }
      if (v.startsWith("quote|")) {
        const qid = v.slice(6);
        const q = quotes.find((x) => String(x.id) === qid);
        setForm((f) => ({
          ...f,
          quoteId: qid,
          repairFlowJobId: q ? String(q.repairFlowJobId || "").trim() : "",
        }));
      }
    },
    [quotes]
  );

  const handleClose = () => {
    if (savingPo) return;
    setPendingPoAttachmentFiles([]);
    onClose();
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSavingPo(true);
    try {
      const res = await fetch("/api/dashboard/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildPurchaseOrderPayload(formRef.current)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create purchase order");
      const newId = data.purchaseOrder?.id;
      const pending = pendingPoAttachmentFiles;
      if (newId && pending.length > 0) {
        const fd = new FormData();
        pending.forEach((f) => fd.append("files", f));
        const up = await fetch(`/api/dashboard/purchase-orders/${newId}/upload`, {
          method: "POST",
          body: fd,
          credentials: "include",
        });
        const upData = await up.json().catch(() => ({}));
        if (!up.ok) {
          toast.error(upData.error || "Purchase order saved but document upload failed.");
        }
      }
      toast.success("Purchase order created.");
      setPendingPoAttachmentFiles([]);
      onCreated?.(data.purchaseOrder);
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to create purchase order");
    } finally {
      setSavingPo(false);
    }
  };

  const openAddVendorModal = () => {
    setVendorForm(INITIAL_VENDOR_FORM);
    setAddVendorModalOpen(true);
  };

  const closeAddVendorModal = () => {
    setAddVendorModalOpen(false);
    setVendorForm(INITIAL_VENDOR_FORM);
  };

  const handleAddVendorSubmit = async (e) => {
    e.preventDefault();
    setSavingVendor(true);
    try {
      const payload = buildVendorPayload(vendorFormRef.current);
      const res = await fetch("/api/dashboard/vendors", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.message ?? "Failed to add vendor");
        return;
      }
      if (data?.vendor?.id) {
        await loadVendors();
        setForm((f) => ({ ...f, vendorId: data.vendor.id }));
        closeAddVendorModal();
        toast.success("Vendor added and selected");
      } else {
        toast.error("Vendor saved but could not select it");
      }
    } catch (err) {
      toast.error(err?.message ?? "Failed to add vendor");
    } finally {
      setSavingVendor(false);
    }
  };

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        title="Create Purchase Order"
        size="4xl"
        actions={
          <Button type="submit" form={CREATE_PO_FORM_ID} variant="primary" size="sm" disabled={savingPo}>
            {savingPo ? "Saving…" : "Save"}
          </Button>
        }
      >
        <Form
          id={CREATE_PO_FORM_ID}
          onSubmit={handleCreateSubmit}
          className={`${FORM_SECTIONS_STACK_CLASS} !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none`}
        >
          <FormSection title="Vendor & type">
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input label="PO #" value={nextPoNumber} readOnly />
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end lg:col-span-2">
                <Select
                  label="Vendor"
                  options={vendorOptions}
                  value={form.vendorId}
                  onChange={(e) => setForm((f) => ({ ...f, vendorId: e.target.value ?? "" }))}
                  placeholder="Select vendor"
                  searchable
                  className="min-w-0 flex-1"
                />
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="h-10 shrink-0 whitespace-nowrap"
                  onClick={openAddVendorModal}
                >
                  + Add New
                </Button>
              </div>
              <Select
                label="Type"
                options={PO_TYPE_OPTIONS}
                value={form.type}
                onChange={(e) => {
                  const next = e.target.value ?? "shop";
                  setForm((f) =>
                    next === "job"
                      ? { ...f, type: next }
                      : { ...f, type: next, quoteId: "", repairFlowJobId: "" }
                  );
                }}
                searchable={false}
                className="lg:col-span-2 min-w-[200px]"
              />
              {form.type === "job" && (
                <Select
                  label="Job # / RFQ#"
                  options={jobLinkOptions}
                  value={jobLinkSelectValue}
                  onChange={handleJobLinkChange}
                  placeholder="Select job # or RFQ# (optional)"
                  searchable
                  className="lg:col-span-2"
                />
              )}
            </div>
          </FormSection>
          <FormSection title="Line items">
            <DataTable
              columns={PO_LINE_COLUMNS}
              data={form.lineItems}
              onChange={(rows) => setForm((f) => ({ ...f, lineItems: rows }))}
              striped
              headerClassName="px-3 py-2.5 text-left text-sm font-semibold text-title"
            />
            <PoLineItemsTotalsTable lines={form.lineItems} fmt={fmt} />
          </FormSection>
          <FormSection title="Notes">
            <Textarea
              label="Notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notes"
              rows={2}
              className="[&_label]:sr-only"
            />
          </FormSection>
          <VendorAttachmentsPanel
            resourceLabel="purchase order"
            vendorId={null}
            attachments={form.attachments}
            onAttachmentsChange={(next) => setForm((f) => ({ ...f, attachments: next }))}
            pendingFiles={pendingPoAttachmentFiles}
            onPendingFilesChange={setPendingPoAttachmentFiles}
            uploading={attachmentPoUploading}
          />
        </Form>
      </Modal>

      <Modal
        open={addVendorModalOpen}
        onClose={closeAddVendorModal}
        title="Add Vendor"
        size="4xl"
        actions={
          <Button type="submit" form={ADD_VENDOR_FORM_ID} variant="primary" size="sm" disabled={savingVendor}>
            {savingVendor ? "Saving…" : "Save"}
          </Button>
        }
      >
        <Form
          id={ADD_VENDOR_FORM_ID}
          onSubmit={handleAddVendorSubmit}
          className={`${FORM_SECTIONS_STACK_CLASS} !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none`}
        >
          <FormSection title="Vendor & contact">
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Vendor name"
                name="name"
                value={vendorForm.name}
                onChange={(e) => setVendorForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Company or supplier name"
                required
              />
              <Input
                label="Contact name"
                name="contactName"
                value={vendorForm.contactName}
                onChange={(e) => setVendorForm((f) => ({ ...f, contactName: e.target.value }))}
                placeholder="Contact person"
              />
              <Input
                label="Phone"
                name="phone"
                value={vendorForm.phone}
                onChange={(e) => setVendorForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="Phone"
              />
              <Input
                label="Email"
                name="email"
                type="email"
                value={vendorForm.email}
                onChange={(e) => setVendorForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="Email"
              />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Address"
                name="address"
                value={vendorForm.address}
                onChange={(e) => setVendorForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Street address"
              />
              <Input
                label="City"
                name="city"
                value={vendorForm.city}
                onChange={(e) => setVendorForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="City"
              />
              <Input
                label="State"
                name="state"
                value={vendorForm.state}
                onChange={(e) => setVendorForm((f) => ({ ...f, state: e.target.value }))}
                placeholder="State"
              />
              <Input
                label="ZIP"
                name="zipCode"
                value={vendorForm.zipCode}
                onChange={(e) => setVendorForm((f) => ({ ...f, zipCode: e.target.value }))}
                placeholder="ZIP code"
              />
            </div>
          </FormSection>
          <FormSection title="Parts & terms">
            <div className="flex flex-col gap-4">
              <Input
                label="Payment terms"
                name="paymentTerms"
                value={vendorForm.paymentTerms}
                onChange={(e) => setVendorForm((f) => ({ ...f, paymentTerms: e.target.value }))}
                placeholder="e.g. Net 30, Net 60"
              />
              <div className="w-full min-w-0">
                <div className="mb-1 text-xs font-medium text-secondary">Parts / materials this vendor supplies</div>
                <DataTable
                  columns={PARTS_SUPPLIED_COLUMNS}
                  data={vendorForm.partsSupplied}
                  onChange={(rows) => setVendorForm((f) => ({ ...f, partsSupplied: rows }))}
                  striped
                />
              </div>
            </div>
          </FormSection>
          <FormSection title="Notes">
            <Textarea
              label="Notes"
              name="notes"
              value={vendorForm.notes}
              onChange={(e) => setVendorForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notes"
              rows={3}
              className="[&_label]:sr-only"
            />
          </FormSection>
        </Form>
      </Modal>
    </>
  );
}
