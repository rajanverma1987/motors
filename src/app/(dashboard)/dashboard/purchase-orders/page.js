"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiEdit2, FiPaperclip, FiPrinter, FiRotateCw, FiSend, FiTrash2 } from "react-icons/fi";
import Button from "@/components/ui/button";
import Table from "@/components/ui/table";
import DataTable from "@/components/ui/data-table";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import Badge from "@/components/ui/badge";
import { Form, FormSection, FORM_SECTIONS_STACK_CLASS } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import { useFormatMoney, useUserSettings } from "@/contexts/user-settings-context";
import PoVendorAccountsSection from "@/components/dashboard/po-vendor-accounts-section";
import DocumentPrintPreviewModal from "@/components/dashboard/document-print-preview-modal";
import VendorAttachmentsPanel from "@/components/dashboard/vendor-attachments-panel";
import StatusFilterPillButton from "@/components/dashboard/status-filter-pill-button";
import CustomerQuickViewModal from "@/components/dashboard/customer-quick-view-modal";
import VendorQuickViewModal from "@/components/dashboard/vendor-quick-view-modal";
import QuoteQuickViewModal from "@/components/dashboard/quote-quick-view-modal";
import SendDocumentPreviewModal from "@/components/dashboard/send-document-preview-modal";
import RepairFlowJobDetailClient from "@/app/(dashboard)/dashboard/repair-flow/[id]/repair-flow-job-detail-client";
import { resolveStatusTileProps } from "@/lib/work-order-status-tiles";

const PO_RECORD_LINK_CLASS =
  "text-left font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded";
import { sumPoLineItemsTaxInclusive, poLineTaxAmount, poLineTotalWithTax, parsePoLineTaxPercent, sumPoLineExtendedPreTax, sumPoLineTaxAmount } from "@/lib/po-line-item-totals";
import { formatDateMdy } from "@/lib/format-date";
import { previewJobPoNumber, previewShopPoNumber } from "@/lib/purchase-order-form-shared";

const PO_LINE_COLUMNS = [
  { key: "description", label: "Description", width: "30%" },
  { key: "qty", label: "Qty", type: "number", width: "8%" },
  { key: "uom", label: "UOM", width: "10%" },
  { key: "unitPrice", label: "Unit price", type: "number", step: "0.00001", width: "12%" },
  { key: "taxPercent", label: "Tax %", type: "number", width: "9%" },
  {
    key: "lineTax",
    label: "Tax",
    calculated: true,
    type: "number",
    formula: (row) => {
      const v = poLineTaxAmount(row);
      if (v == null || !Number.isFinite(v)) return "";
      return Math.round(v * 100) / 100;
    },
    displayDecimals: 2,
  },
  {
    key: "total",
    label: "Total",
    calculated: true,
    type: "number",
    formula: (row) => {
      const v = poLineTotalWithTax(row);
      if (v == null || !Number.isFinite(v)) return "";
      return Math.round(v * 100) / 100;
    },
    displayDecimals: 2,
  },
];

const PO_TYPE_OPTIONS = [
  { value: "shop", label: "Shop PO" },
  { value: "job", label: "Job PO (linked to repair job or quote)" },
];

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

const STATUS_VARIANT = {
  Open: "default",
  "Partially Invoiced": "warning",
  "Fully Invoiced": "primary",
  "Partially Paid": "warning",
  "Fully Paid": "success",
  Closed: "success",
};

const INVOICED_STATUS_VARIANT = {
  Partial: "warning",
  Invoiced: "success",
  "—": "default",
};

const PAID_STATUS_VARIANT = {
  Partially: "warning",
  Paid: "success",
  "—": "default",
};

const DELIVERY_STATUS_VARIANT = {
  Partial: "warning",
  Delivered: "success",
};

const INITIAL_FORM = {
  vendorId: "",
  type: "shop",
  quoteId: "",
  repairFlowJobId: "",
  lineItems: [],
  notes: "",
  attachments: [],
};

function buildPayload(form) {
  const f = form || {};
  return {
    vendorId: f.vendorId ?? "",
    type: f.type === "job" ? "job" : "shop",
    quoteId: f.type === "job" ? String(f.quoteId ?? "").trim() : "",
    repairFlowJobId: f.type === "job" ? String(f.repairFlowJobId ?? "").trim() : "",
    lineItems: Array.isArray(f.lineItems) ? f.lineItems : [],
    notes: f.notes ?? "",
    attachments: Array.isArray(f.attachments) ? f.attachments : [],
  };
}

/** Dashboard list routes return `{ items, totalCount }` when `page` / `pageSize` are sent. */
async function fetchAllPaginatedItems(basePath) {
  const pageSize = 100;
  let page = 1;
  const all = [];
  for (; ;) {
    const sep = basePath.includes("?") ? "&" : "?";
    const res = await fetch(`${basePath}${sep}page=${page}&pageSize=${pageSize}`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load");
    const items = Array.isArray(data?.items) ? data.items : [];
    all.push(...items);
    const total = Number(data?.totalCount);
    if (items.length < pageSize || (Number.isFinite(total) && all.length >= total)) break;
    page += 1;
    if (page > 500) break;
  }
  return all;
}

const poViewPanel = "overflow-hidden rounded-lg border border-border bg-card";
const poViewSectionTitle = "text-[10px] font-semibold uppercase tracking-wide text-secondary";

function PoViewMetaField({ label, children, className = "", prominent = false }) {
  return (
    <div className={`min-w-0 ${className}`.trim()}>
      <dt
        className={
          prominent
            ? "text-xs font-semibold uppercase tracking-wide text-secondary"
            : poViewSectionTitle
        }
      >
        {label}
      </dt>
      <dd
        className={
          prominent
            ? "mt-1 text-lg font-semibold leading-snug text-title sm:text-xl"
            : "mt-0.5 text-sm font-medium text-title"
        }
      >
        {children}
      </dd>
    </div>
  );
}

function PoViewAmountCard({ label, amount, fmt, emphasis = false }) {
  return (
    <div
      className={`rounded-lg border border-border px-3 py-2 ${emphasis ? "bg-primary/5 ring-1 ring-primary/15" : "bg-muted/20"
        }`}
    >
      <p className="text-sm font-bold uppercase tracking-wide text-title">{label}</p>
      <p
        className={`mt-0.5 text-right tabular-nums ${emphasis ? "text-lg font-bold text-title" : "text-base font-semibold text-title"
          }`}
      >
        {fmt(amount)}
      </p>
    </div>
  );
}

function lineItemStatusMeta(row) {
  const itemStatus =
    row?.status === "Received"
      ? "Received"
      : row?.status === "Back Order"
        ? "Back Order"
        : row?.status === "Delivered" || row?.status === "Dispatch"
          ? "Dispatch"
          : "Ordered";
  const itemBadgeVariant =
    itemStatus === "Received"
      ? "success"
      : itemStatus === "Back Order"
        ? "warning"
        : itemStatus === "Dispatch"
          ? "primary"
          : "default";
  return { itemStatus, itemBadgeVariant };
}

function PoViewLineItemsTable({ lineItems, otherCharges = [], fmt }) {
  const rows = Array.isArray(lineItems) ? lineItems : [];
  const orderSubtotal = sumPoLineExtendedPreTax(rows);
  const totalTax = sumPoLineTaxAmount(rows);
  const lineGrand = sumPoLineItemsTaxInclusive(rows);
  const otherChargesList = Array.isArray(otherCharges) ? otherCharges : [];
  const otherChargesTotal = otherChargesList.reduce((sum, row) => {
    const n = parseFloat(row?.amount ?? "0");
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
  const grandTotal = lineGrand + otherChargesTotal;
  const thClass =
    "px-3 py-2.5 text-left text-sm font-bold uppercase tracking-wide text-title";

  if (!rows.length) {
    return <p className="px-4 py-6 text-center text-sm text-secondary">No line items.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="border-b border-border bg-muted/30">
          <tr>
            <th className={`${thClass} min-w-[12rem]`}>Description</th>
            <th className={`${thClass} text-right`}>Qty</th>
            <th className={thClass}>UOM</th>
            <th className={`${thClass} text-right`}>Unit price</th>
            <th className={`${thClass} text-right`}>Tax %</th>
            <th className={`${thClass} text-right`}>Tax</th>
            <th className={`${thClass} text-right`}>Total</th>
            <th className={thClass}>Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row, i) => {
            const taxAmt = poLineTaxAmount(row);
            const lineTot = poLineTotalWithTax(row);
            const taxPct = parsePoLineTaxPercent(row?.taxPercent);
            const total =
              lineTot != null && Number.isFinite(lineTot) ? lineTot.toFixed(2) : "—";
            const { itemStatus, itemBadgeVariant } = lineItemStatusMeta(row);
            return (
              <tr key={i} className="bg-card hover:bg-muted/15">
                <td className="px-3 py-2.5 font-medium text-title">{row?.description || "—"}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-title">{row?.qty ?? "—"}</td>
                <td className="px-3 py-2.5 text-title">{row?.uom || "—"}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-title">
                  {row?.unitPrice ? fmt(row.unitPrice) : "—"}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-secondary">{`${taxPct || 0}%`}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-title">
                  {taxAmt != null && Number.isFinite(taxAmt) ? fmt(taxAmt) : "—"}
                </td>
                <td className="px-3 py-2.5 text-right font-medium tabular-nums text-title">
                  {total !== "—" ? fmt(parseFloat(total)) : "—"}
                </td>
                <td className="px-3 py-2.5">
                  <Badge variant={itemBadgeVariant} className="rounded-full px-2.5 py-0.5 text-xs">
                    {itemStatus}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="border-t-2 border-border bg-muted/25">
          <tr>
            <td colSpan={6} className="px-3 py-2 text-right text-secondary">
              Order total
            </td>
            <td className="px-3 py-2 text-right font-medium tabular-nums text-title">{fmt(orderSubtotal)}</td>
            <td />
          </tr>
          <tr>
            <td colSpan={6} className="px-3 py-2 text-right text-secondary">
              Total tax
            </td>
            <td className="px-3 py-2 text-right font-medium tabular-nums text-title">{fmt(totalTax)}</td>
            <td />
          </tr>
          {otherChargesList.map((row, i) => (
            <tr key={row.logisticsEntryId || `other-${i}`}>
              <td colSpan={6} className="px-3 py-2 text-right text-secondary">
                Other charges
              </td>
              <td className="px-3 py-2 text-right font-medium tabular-nums text-title">
                {row?.amount ? fmt(row.amount) : "—"}
              </td>
              <td />
            </tr>
          ))}
          <tr className="bg-muted/40">
            <td colSpan={6} className="px-3 py-2.5 text-right font-semibold text-title">
              Grand total
            </td>
            <td className="px-3 py-2.5 text-right text-base font-bold tabular-nums text-title">
              {fmt(grandTotal)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function PoLineItemsTotalsTable({ lines, otherCharges = [], fmt }) {
  const arr = Array.isArray(lines) ? lines : [];
  const orderSubtotal = sumPoLineExtendedPreTax(arr);
  const totalTax = sumPoLineTaxAmount(arr);
  const lineGrand = sumPoLineItemsTaxInclusive(arr);
  const otherChargesList = Array.isArray(otherCharges) ? otherCharges : [];
  const otherChargesTotal = otherChargesList.reduce((sum, row) => {
    const n = parseFloat(row?.amount ?? "0");
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
  const grandTotal = lineGrand + otherChargesTotal;
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-border bg-card">
      <table className="ml-auto w-full max-w-md text-sm">
        <tbody>
          <tr className="border-b border-border">
            <td className="px-3 py-2 text-secondary">Order total</td>
            <td className="px-3 py-2 text-right font-medium tabular-nums text-title">{fmt(orderSubtotal)}</td>
          </tr>
          <tr className="border-b border-border">
            <td className="px-3 py-2 text-secondary">Total tax</td>
            <td className="px-3 py-2 text-right font-medium tabular-nums text-title">{fmt(totalTax)}</td>
          </tr>
          {otherChargesList.map((row, i) => (
            <tr key={row.logisticsEntryId || `other-${i}`} className="border-b border-border">
              <td className="px-3 py-2 text-secondary">
                Other charges
              </td>
              <td className="px-3 py-2 text-right font-medium tabular-nums text-title">
                {row?.amount ? fmt(row.amount) : "—"}
              </td>
            </tr>
          ))}
          <tr className="border-t border-border bg-muted/30">
            <td className="px-3 py-2 font-semibold text-title">Grand total</td>
            <td className="px-3 py-2 text-right font-semibold tabular-nums text-title">{fmt(grandTotal)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function PoViewDetailBody({
  viewingPo,
  vendorName,
  onOpenVendor,
  jobLabel,
  onOpenJobLink,
  fmt,
  accountSettings,
}) {
  const poStatusVariant = STATUS_VARIANT[viewingPo.status] || "default";

  return (
    <div className="space-y-4">
      <div className={`${poViewPanel} p-4 sm:p-5`}>
        <header className="min-w-0">
          <p className={poViewSectionTitle}>Vendor</p>
          {String(viewingPo?.vendorId || "").trim() && vendorName && vendorName !== "—" ? (
            <button
              type="button"
              className="mt-0.5 block text-left text-2xl font-bold leading-tight tracking-tight text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded sm:text-[1.65rem]"
              onClick={() => onOpenVendor?.(viewingPo.vendorId)}
              title="Open vendor"
            >
              {vendorName}
            </button>
          ) : (
            <h2 className="mt-0.5 text-2xl font-bold leading-tight tracking-tight text-title sm:text-[1.65rem]">
              {vendorName}
            </h2>
          )}
          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <PoViewMetaField label="PO #" prominent>
              <span className="font-mono text-xl font-bold text-primary sm:text-2xl">
                {viewingPo.poNumber || "—"}
              </span>
            </PoViewMetaField>
            <PoViewMetaField label="PO date" prominent>
              <span className="tabular-nums">{formatDateMdy(viewingPo.createdAt)}</span>
            </PoViewMetaField>
            <PoViewMetaField label="Type" prominent>
              <Badge variant="default" className="rounded-full px-3 py-1 text-sm font-semibold">
                {viewingPo.type === "job" ? "Job PO" : "Shop PO"}
              </Badge>
            </PoViewMetaField>
            {viewingPo.type === "job" ? (
              <PoViewMetaField label="Job #" prominent>
                {jobLabel && jobLabel !== "—" &&
                  (String(viewingPo.repairFlowJobId || "").trim() || String(viewingPo.quoteId || "").trim()) ? (
                  <button
                    type="button"
                    className={`font-mono tabular-nums ${PO_RECORD_LINK_CLASS}`}
                    onClick={() => onOpenJobLink?.(viewingPo)}
                    title="Open job or RFQ"
                  >
                    {jobLabel}
                  </button>
                ) : (
                  <span className="font-mono tabular-nums">{jobLabel}</span>
                )}
              </PoViewMetaField>
            ) : null}
            <PoViewMetaField label="PO status" prominent>
              <Badge variant={poStatusVariant} className="rounded-full px-3 py-1 text-sm font-semibold">
                {viewingPo.status ?? "Open"}
              </Badge>
            </PoViewMetaField>
            <PoViewMetaField label="Delivered" prominent>
              <Badge
                variant={DELIVERY_STATUS_VARIANT[viewingPo.deliveryStatus] || "default"}
                className="rounded-full px-3 py-1 text-sm font-semibold"
              >
                {viewingPo.deliveryStatus ?? "—"}
              </Badge>
            </PoViewMetaField>
            <PoViewMetaField label="Invoiced" prominent>
              <Badge
                variant={INVOICED_STATUS_VARIANT[viewingPo.invoicedStatus] || "default"}
                className="rounded-full px-3 py-1 text-sm font-semibold"
              >
                {viewingPo.invoicedStatus ?? "—"}
              </Badge>
            </PoViewMetaField>
            <PoViewMetaField label="Paid" prominent>
              <Badge
                variant={PAID_STATUS_VARIANT[viewingPo.paidStatus] || "default"}
                className="rounded-full px-3 py-1 text-sm font-semibold"
              >
                {viewingPo.paidStatus ?? "—"}
              </Badge>
            </PoViewMetaField>
          </dl>
        </header>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:max-w-md sm:gap-3">
        <PoViewAmountCard label="Vendor invoiced" amount={viewingPo.totalInvoiced || 0} fmt={fmt} />
        <PoViewAmountCard label="Paid" amount={viewingPo.totalPaid || 0} fmt={fmt} emphasis />
      </div>

      {(accountSettings?.accountsBillingAddress || accountSettings?.accountsShippingAddress) && (
        <div className={`${poViewPanel} p-4 sm:p-5`}>
          <h3 className={`mb-3 ${poViewSectionTitle}`}>Your billing &amp; ship-to (shown to vendor)</h3>
          <PoVendorAccountsSection
            billingAddress={accountSettings?.accountsBillingAddress}
            shippingAddress={accountSettings?.accountsShippingAddress}
          />
        </div>
      )}

      <div className={poViewPanel}>
        <div className="border-b border-border px-4 py-3 sm:px-5">
          <h3 className="text-sm font-bold text-title">Line items</h3>
        </div>
        <PoViewLineItemsTable
          lineItems={viewingPo.lineItems}
          otherCharges={viewingPo.otherCharges}
          fmt={fmt}
        />
      </div>
    </div>
  );
}

export default function DashboardPurchaseOrdersPage() {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const openPoId = searchParams.get("open");
  const confirm = useConfirm();
  const fmt = useFormatMoney();
  const { settings: accountSettings } = useUserSettings();
  const [pos, setPos] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [repairJobs, setRepairJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [poTypeFilter, setPoTypeFilter] = useState("");
  const [summaryByType, setSummaryByType] = useState({
    all: { count: 0, amount: 0 },
    shop: { count: 0, amount: 0 },
    job: { count: 0, amount: 0 },
  });
  const [openVendorId, setOpenVendorId] = useState(null);
  const [openCustomerId, setOpenCustomerId] = useState(null);
  const [openQuoteId, setOpenQuoteId] = useState(null);
  const [linkedJobId, setLinkedJobId] = useState(null);
  const [linkedJobHeader, setLinkedJobHeader] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [tableSort, setTableSort] = useState({ key: "createdAt", direction: "desc" });
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewingPo, setViewingPo] = useState(null);
  const [viewLoadingPoId, setViewLoadingPoId] = useState(null);
  const [savingPo, setSavingPo] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const formRef = useRef(form);
  formRef.current = form;

  const [attachInvoiceOpen, setAttachInvoiceOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNumber: "",
    date: "",
    amount: "",
    attachmentUrl: "",
    attachmentName: "",
  });
  const [editingVendorInvoiceIndex, setEditingVendorInvoiceIndex] = useState(null);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [uploadingInvoiceFile, setUploadingInvoiceFile] = useState(false);
  const invoiceFileInputRef = useRef(null);

  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: "", date: "", method: "", reference: "" });
  const [editingPaymentIndex, setEditingPaymentIndex] = useState(null);
  const [savingPayment, setSavingPayment] = useState(false);

  const [addVendorModalOpen, setAddVendorModalOpen] = useState(false);
  const [vendorForm, setVendorForm] = useState(INITIAL_VENDOR_FORM);
  const [savingVendor, setSavingVendor] = useState(false);
  const vendorFormRef = useRef(vendorForm);
  vendorFormRef.current = vendorForm;

  const [sendEmailPreview, setSendEmailPreview] = useState(null);
  const [printPoId, setPrintPoId] = useState(null);

  const [pendingPoAttachmentFiles, setPendingPoAttachmentFiles] = useState([]);
  const [attachmentPoUploading, setAttachmentPoUploading] = useState(false);
  const [docsPoModalOpen, setDocsPoModalOpen] = useState(false);
  const [docsPoMeta, setDocsPoMeta] = useState(null);
  const [docsPoAttachments, setDocsPoAttachments] = useState([]);
  const [docsPoLoading, setDocsPoLoading] = useState(false);
  const [docsPoSaving, setDocsPoSaving] = useState(false);

  const vendorNameMap = useMemo(() => {
    const m = {};
    vendors.forEach((v) => { m[v.id] = v.name || v.id || "—"; });
    return m;
  }, [vendors]);
  const vendorOptions = useMemo(() => {
    const base = vendors.map((v) => ({ value: v.id, label: v.name || v.id || "—" }));
    const selectedVendorId = String(form.vendorId ?? "").trim();
    if (!selectedVendorId) return base;
    if (base.some((opt) => opt.value === selectedVendorId)) return base;
    const fallbackLabel = vendorNameMap[selectedVendorId] || selectedVendorId;
    return [{ value: selectedVendorId, label: fallbackLabel }, ...base];
  }, [vendors, form.vendorId, vendorNameMap]);

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

  const handleJobLinkChange = useCallback((e) => {
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
  }, [quotes]);

  const loadPos = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (poTypeFilter === "shop" || poTypeFilter === "job") params.set("type", poTypeFilter);
      if (tableSort?.key) {
        params.set("sortBy", tableSort.key);
        params.set("sortDir", tableSort.direction || "asc");
      }
      const res = await fetch(`/api/dashboard/purchase-orders?${params.toString()}`, { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load purchase orders");
      setPos(Array.isArray(data?.items) ? data.items : []);
      setTotalCount(Number(data?.totalCount) || 0);
      const summary = data?.summaryByType;
      if (summary && typeof summary === "object") {
        setSummaryByType({
          all: {
            count: Number(summary.all?.count) || 0,
            amount: Number(summary.all?.amount) || 0,
          },
          shop: {
            count: Number(summary.shop?.count) || 0,
            amount: Number(summary.shop?.amount) || 0,
          },
          job: {
            count: Number(summary.job?.count) || 0,
            amount: Number(summary.job?.amount) || 0,
          },
        });
      }
    } catch (e) {
      toast.error(e.message || "Failed to load purchase orders");
      setPos([]);
      setTotalCount(0);
      setSummaryByType({ all: { count: 0, amount: 0 }, shop: { count: 0, amount: 0 }, job: { count: 0, amount: 0 } });
    } finally {
      setLoading(false);
    }
  }, [toast, page, pageSize, searchQuery, poTypeFilter, tableSort]);

  const poTypeSummaryCards = useMemo(() => {
    const tileFor = (index) => resolveStatusTileProps("", index);
    return [
      {
        key: "",
        label: "All",
        count: summaryByType.all?.count ?? 0,
        amount: summaryByType.all?.amount ?? 0,
        tileAppearance: tileFor(0),
      },
      {
        key: "shop",
        label: "Shop PO",
        count: summaryByType.shop?.count ?? 0,
        amount: summaryByType.shop?.amount ?? 0,
        tileAppearance: tileFor(1),
      },
      {
        key: "job",
        label: "Job PO",
        count: summaryByType.job?.count ?? 0,
        amount: summaryByType.job?.amount ?? 0,
        tileAppearance: tileFor(2),
      },
    ];
  }, [summaryByType]);

  const loadVendors = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/vendors?page=1&pageSize=1000", { credentials: "include", cache: "no-store" });
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
        fetchAllPaginatedItems("/api/dashboard/quotes"),
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await Promise.all([loadPos(), loadVendors(), loadJobLinkLists()]);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [loadPos, loadVendors, loadJobLinkLists]);

  useEffect(() => {
    const id = openPoId?.trim();
    if (!id) return;
    setViewLoadingPoId(id);
    setViewModalOpen(true);
    router.replace("/dashboard/purchase-orders", { scroll: false });
  }, [openPoId, router]);

  const openCreateModal = () => {
    setForm(INITIAL_FORM);
    setPendingPoAttachmentFiles([]);
    setCreateModalOpen(true);
  };
  const closeCreateModal = () => {
    setPendingPoAttachmentFiles([]);
    setCreateModalOpen(false);
  };

  const nextPoNumber = useMemo(() => {
    if (form.type === "job") {
      const qid = String(form.quoteId || "").trim();
      if (qid) {
        const quote = quotes.find((q) => String(q.id) === qid);
        const rfq = String(quote?.rfqNumber || "").trim();
        if (rfq) {
          const count = pos.filter((p) => p.type === "job" && String(p.quoteId || "") === qid).length;
          return previewJobPoNumber(rfq, count);
        }
      }
    }
    return previewShopPoNumber(pos);
  }, [pos, form.type, form.quoteId, quotes]);

  const openAddVendorModal = () => {
    setVendorForm(INITIAL_VENDOR_FORM);
    setAddVendorModalOpen(true);
  };
  const closeAddVendorModal = () => {
    setAddVendorModalOpen(false);
    setVendorForm(INITIAL_VENDOR_FORM);
  };

  const handleSendToVendor = (poFromTable) => {
    const po = poFromTable ?? viewingPo;
    const poId = po?.id;
    if (!poId) return;
    setSendEmailPreview({
      poId,
      poNumber: po?.poNumber || poId,
    });
  };

  const handleDeletePo = useCallback(
    async (row) => {
      if (!row?.id) return;
      const ok = await confirm({
        title: "Delete purchase order",
        message: `Delete purchase order ${row.poNumber || row.id}? This cannot be undone.`,
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
        variant: "danger",
      });
      if (!ok) return;
      try {
        const res = await fetch(`/api/dashboard/purchase-orders/${row.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to delete purchase order");
        toast.success("Purchase order deleted.");
        setPos((prev) => prev.filter((p) => p.id !== row.id));
        if (viewingPo?.id === row.id) {
          closeViewModal();
        }
      } catch (err) {
        toast.error(err.message || "Failed to delete purchase order");
      }
    },
    [confirm, toast, viewingPo]
  );

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

  const openViewModal = (po) => {
    if (!po?.id) {
      setViewingPo(po);
      setViewModalOpen(true);
      return;
    }
    setViewingPo(null);
    setViewLoadingPoId(po.id);
    setViewModalOpen(true);
  };

  useEffect(() => {
    if (!viewModalOpen || !viewLoadingPoId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/dashboard/purchase-orders/${viewLoadingPoId}`, {
          credentials: "include",
          cache: "no-store",
          headers: { Pragma: "no-cache", "Cache-Control": "no-cache" },
        });
        if (cancelled) return;
        if (!res.ok) {
          setViewLoadingPoId(null);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setViewingPo(data);
        setViewLoadingPoId(null);
      } catch {
        if (!cancelled) setViewLoadingPoId(null);
      }
    })();
    return () => { cancelled = true; };
  }, [viewModalOpen, viewLoadingPoId]);

  const closeViewModal = () => {
    queueMicrotask(() => {
      setViewModalOpen(false);
      setViewingPo(null);
      setViewLoadingPoId(null);
      setAttachInvoiceOpen(false);
      setEditingVendorInvoiceIndex(null);
      setInvoiceForm({
        invoiceNumber: "",
        date: "",
        amount: "",
        attachmentUrl: "",
        attachmentName: "",
      });
      setRecordPaymentOpen(false);
      setEditingPaymentIndex(null);
      setPaymentForm({ amount: "", date: "", method: "", reference: "" });
    });
  };

  const openDocsPoModal = (row) => {
    if (!row?.id) return;
    setDocsPoMeta({ id: row.id, label: row.poNumber || row.id });
    setDocsPoAttachments([]);
    setDocsPoModalOpen(true);
  };

  const closeDocsPoModal = () => {
    setDocsPoModalOpen(false);
    setDocsPoMeta(null);
    setDocsPoAttachments([]);
    setDocsPoLoading(false);
  };

  const persistDocsPoAttachments = async (next) => {
    if (!docsPoMeta?.id) return;
    setDocsPoSaving(true);
    try {
      const res = await fetch(`/api/dashboard/purchase-orders/${docsPoMeta.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ attachments: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      const att = Array.isArray(data.purchaseOrder?.attachments) ? data.purchaseOrder.attachments : next;
      setDocsPoAttachments(att);
      await loadPos();
    } catch (e) {
      toast.error(e.message || "Could not update documents");
    } finally {
      setDocsPoSaving(false);
    }
  };

  const handleDocsPoRemoveRow = async (_index, row) => {
    const next = docsPoAttachments.filter((a) => a.url !== row.url);
    await persistDocsPoAttachments(next);
  };

  const handlePoFileUpload = async (files, poId) => {
    const id = String(poId || "").trim();
    if (!id) {
      toast.error("Save the purchase order first, then add documents.");
      return;
    }
    setAttachmentPoUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files", f));
      const res = await fetch(`/api/dashboard/purchase-orders/${id}/upload`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setForm((f) => ({ ...f, attachments: Array.isArray(data.attachments) ? data.attachments : f.attachments }));
      toast.success("Files uploaded.");
      loadPos();
    } catch (err) {
      toast.error(err.message || "Upload failed");
    } finally {
      setAttachmentPoUploading(false);
    }
  };

  useEffect(() => {
    if (!docsPoModalOpen || !docsPoMeta?.id) return;
    let cancelled = false;
    setDocsPoLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/dashboard/purchase-orders/${docsPoMeta.id}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (cancelled) return;
        if (!res.ok) {
          setDocsPoAttachments([]);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        setDocsPoAttachments(Array.isArray(data.attachments) ? data.attachments : []);
      } catch {
        if (!cancelled) setDocsPoAttachments([]);
      } finally {
        if (!cancelled) setDocsPoLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [docsPoModalOpen, docsPoMeta?.id]);

  const openEditModal = async (po) => {
    if (!po) return;
    let dataToUse = po;
    if (po?.id) {
      try {
        const res = await fetch(`/api/dashboard/purchase-orders/${po.id}`, { credentials: "include" });
        if (res.ok) dataToUse = await res.json();
      } catch { }
    }
    const normalizedType = String(dataToUse.type ?? "")
      .trim()
      .toLowerCase() === "job"
      ? "job"
      : "shop";
    setForm({
      vendorId: String(dataToUse.vendorId ?? "").trim(),
      type: normalizedType,
      quoteId: normalizedType === "job" ? String(dataToUse.quoteId ?? "").trim() : "",
      repairFlowJobId: normalizedType === "job" ? String(dataToUse.repairFlowJobId ?? "").trim() : "",
      lineItems: Array.isArray(dataToUse.lineItems) ? dataToUse.lineItems : [],
      notes: dataToUse.notes ?? "",
      attachments: Array.isArray(dataToUse.attachments) ? dataToUse.attachments : [],
    });
    setViewingPo(dataToUse);
    setEditModalOpen(true);
  };
  const closeEditModal = () => {
    setEditModalOpen(false);
    setViewingPo(null);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSavingPo(true);
    try {
      const res = await fetch("/api/dashboard/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildPayload(formRef.current)),
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
      closeCreateModal();
      loadPos();
    } catch (err) {
      toast.error(err.message || "Failed to create purchase order");
    } finally {
      setSavingPo(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!viewingPo?.id) return;
    setSavingPo(true);
    try {
      const res = await fetch(`/api/dashboard/purchase-orders/${viewingPo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...buildPayload(formRef.current),
          vendorInvoices: viewingPo.vendorInvoices ?? [],
          payments: viewingPo.payments ?? [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update purchase order");
      toast.success("Purchase order updated.");
      setViewingPo(data.purchaseOrder);
      closeEditModal();
      loadPos();
    } catch (err) {
      toast.error(err.message || "Failed to update purchase order");
    } finally {
      setSavingPo(false);
    }
  };

  const handleInvoiceFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !viewingPo?.id) return;
    setUploadingInvoiceFile(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/dashboard/purchase-orders/${viewingPo.id}/upload-invoice`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setInvoiceForm((f) => ({
        ...f,
        attachmentUrl: data.url ?? "",
        attachmentName: data.name ?? file.name ?? "",
      }));
    } catch (err) {
      toast.error(err.message || "Failed to upload file");
    } finally {
      setUploadingInvoiceFile(false);
      if (invoiceFileInputRef.current) invoiceFileInputRef.current.value = "";
    }
  };

  const todayString = () => {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  };

  const balanceDueForPo = useCallback((po) => {
    if (!po) return 0;
    return poAmountDueForPayment(po);
  }, []);

  const defaultPaymentAmount = useCallback(
    (po) => {
      const bal = balanceDueForPo(po);
      if (bal <= 0.009) return "";
      return (Math.round(bal * 100) / 100).toFixed(2);
    },
    [balanceDueForPo]
  );

  const emptyPaymentForm = (dateDefault = "", amountDefault = "") => ({
    amount: amountDefault,
    date: dateDefault,
    method: "",
    reference: "",
  });

  const emptyInvoiceForm = (dateDefault = "") => ({
    invoiceNumber: "",
    date: dateDefault,
    amount: "",
    attachmentUrl: "",
    attachmentName: "",
  });

  const closeAttachInvoiceModal = () => {
    setAttachInvoiceOpen(false);
    setEditingVendorInvoiceIndex(null);
    setInvoiceForm(emptyInvoiceForm());
    if (invoiceFileInputRef.current) invoiceFileInputRef.current.value = "";
  };

  const openAttachInvoiceModal = () => {
    setEditingVendorInvoiceIndex(null);
    setInvoiceForm(emptyInvoiceForm(todayString()));
    setAttachInvoiceOpen(true);
  };

  const persistPoVendorInvoices = async (vendorInvoices) => {
    if (!viewingPo?.id) throw new Error("No purchase order");
    const res = await fetch(`/api/dashboard/purchase-orders/${viewingPo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        vendorId: viewingPo.vendorId,
        type: viewingPo.type,
        quoteId: viewingPo.quoteId,
        repairFlowJobId: viewingPo.repairFlowJobId ?? "",
        lineItems: viewingPo.lineItems ?? [],
        vendorInvoices,
        payments: viewingPo.payments ?? [],
        notes: viewingPo.notes,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to update vendor invoices");
    setViewingPo(data.purchaseOrder);
    loadPos();
    return data.purchaseOrder;
  };

  const handleEditVendorInvoice = (index) => {
    const inv = viewingPo?.vendorInvoices?.[index];
    if (!inv) return;
    setEditingVendorInvoiceIndex(index);
    setInvoiceForm({
      invoiceNumber: inv.invoiceNumber ?? "",
      date: inv.date ?? "",
      amount: inv.amount ?? "",
      attachmentUrl: inv.attachmentUrl ?? "",
      attachmentName: inv.attachmentName ?? "",
    });
    if (invoiceFileInputRef.current) invoiceFileInputRef.current.value = "";
  };

  const handleDeleteVendorInvoice = async (index) => {
    if (!viewingPo?.id) return;
    const inv = viewingPo.vendorInvoices?.[index];
    const ok = await confirm({
      title: "Delete vendor invoice",
      message: `Remove vendor invoice${inv?.invoiceNumber ? ` #${inv.invoiceNumber}` : ""}${inv?.amount ? ` (${fmt(inv.amount)})` : ""}? This cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!ok) return;
    setSavingInvoice(true);
    try {
      const next = (viewingPo.vendorInvoices || []).filter((_, i) => i !== index);
      await persistPoVendorInvoices(next);
      if (editingVendorInvoiceIndex === index) {
        setEditingVendorInvoiceIndex(null);
        setInvoiceForm(emptyInvoiceForm(todayString()));
        if (invoiceFileInputRef.current) invoiceFileInputRef.current.value = "";
      } else if (editingVendorInvoiceIndex != null && editingVendorInvoiceIndex > index) {
        setEditingVendorInvoiceIndex(editingVendorInvoiceIndex - 1);
      }
      toast.success("Vendor invoice removed.");
    } catch (err) {
      toast.error(err.message || "Failed to delete vendor invoice");
    } finally {
      setSavingInvoice(false);
    }
  };

  const handleAttachInvoice = async (e) => {
    e.preventDefault();
    if (!viewingPo?.id) return;
    setSavingInvoice(true);
    try {
      const entry = {
        invoiceNumber: invoiceForm.invoiceNumber,
        date: invoiceForm.date,
        amount: invoiceForm.amount,
        attachmentUrl: invoiceForm.attachmentUrl ?? "",
        attachmentName: invoiceForm.attachmentName ?? "",
      };
      const current = [...(viewingPo.vendorInvoices || [])];
      const isEdit = editingVendorInvoiceIndex != null && editingVendorInvoiceIndex >= 0;
      const next = isEdit
        ? current.map((inv, i) => (i === editingVendorInvoiceIndex ? entry : inv))
        : [...current, entry];
      await persistPoVendorInvoices(next);
      toast.success(isEdit ? "Vendor invoice updated." : "Vendor invoice attached.");
      setEditingVendorInvoiceIndex(null);
      setInvoiceForm(emptyInvoiceForm(todayString()));
      if (invoiceFileInputRef.current) invoiceFileInputRef.current.value = "";
      if (!isEdit) closeAttachInvoiceModal();
    } catch (err) {
      toast.error(err.message || "Failed to save vendor invoice");
    } finally {
      setSavingInvoice(false);
    }
  };

  const closeRecordPaymentModal = () => {
    setRecordPaymentOpen(false);
    setEditingPaymentIndex(null);
    setPaymentForm(emptyPaymentForm());
  };

  const openRecordPaymentModal = async () => {
    setEditingPaymentIndex(null);
    const date = todayString();
    setRecordPaymentOpen(true);
    setPaymentForm(emptyPaymentForm(date, defaultPaymentAmount(viewingPo)));

    if (!viewingPo?.id) return;
    try {
      const res = await fetch(`/api/dashboard/purchase-orders/${viewingPo.id}`, {
        credentials: "include",
        cache: "no-store",
        headers: { Pragma: "no-cache", "Cache-Control": "no-cache" },
      });
      if (!res.ok) return;
      const po = await res.json();
      setViewingPo(po);
      setPaymentForm(emptyPaymentForm(date, defaultPaymentAmount(po)));
    } catch {
      /* keep amount from current viewingPo */
    }
  };

  const persistPoPayments = async (payments) => {
    if (!viewingPo?.id) throw new Error("No purchase order");
    const res = await fetch(`/api/dashboard/purchase-orders/${viewingPo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        vendorId: viewingPo.vendorId,
        type: viewingPo.type,
        quoteId: viewingPo.quoteId,
        repairFlowJobId: viewingPo.repairFlowJobId ?? "",
        lineItems: viewingPo.lineItems ?? [],
        vendorInvoices: viewingPo.vendorInvoices ?? [],
        payments,
        notes: viewingPo.notes,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to update payments");
    setViewingPo(data.purchaseOrder);
    loadPos();
    return data.purchaseOrder;
  };

  const handleEditPayment = (index) => {
    const pay = viewingPo?.payments?.[index];
    if (!pay) return;
    setEditingPaymentIndex(index);
    setPaymentForm({
      amount: pay.amount ?? "",
      date: pay.date ?? "",
      method: pay.method ?? "",
      reference: pay.reference ?? "",
    });
  };

  const handleDeletePayment = async (index) => {
    if (!viewingPo?.id) return;
    const pay = viewingPo.payments?.[index];
    const ok = await confirm({
      title: "Delete payment",
      message: `Remove this payment${pay?.amount ? ` (${fmt(pay.amount)})` : ""}? This cannot be undone.`,
      confirmLabel: "Delete",
      cancelLabel: "Cancel",
      variant: "danger",
    });
    if (!ok) return;
    setSavingPayment(true);
    try {
      const next = (viewingPo.payments || []).filter((_, i) => i !== index);
      await persistPoPayments(next);
      if (editingPaymentIndex === index) {
        setEditingPaymentIndex(null);
        setPaymentForm(emptyPaymentForm(todayString()));
      } else if (editingPaymentIndex != null && editingPaymentIndex > index) {
        setEditingPaymentIndex(editingPaymentIndex - 1);
      }
      toast.success("Payment removed.");
    } catch (err) {
      toast.error(err.message || "Failed to delete payment");
    } finally {
      setSavingPayment(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!viewingPo?.id) return;
    setSavingPayment(true);
    try {
      const current = [...(viewingPo.payments || [])];
      const entry = { ...paymentForm };
      const isEdit = editingPaymentIndex != null && editingPaymentIndex >= 0;
      const next = isEdit
        ? current.map((p, i) => (i === editingPaymentIndex ? entry : p))
        : [...current, entry];
      const updated = await persistPoPayments(next);
      toast.success(isEdit ? "Payment updated." : "Payment recorded.");
      setEditingPaymentIndex(null);
      setPaymentForm(emptyPaymentForm(todayString(), defaultPaymentAmount(updated)));
    } catch (err) {
      toast.error(err.message || "Failed to save payment");
    } finally {
      setSavingPayment(false);
    }
  };

  const handleTableSort = useCallback((key, direction) => {
    setPage(1);
    setTableSort({ key, direction });
  }, []);

  const openPoJobLink = useCallback((row) => {
    const jobId = String(row?.repairFlowJobId || "").trim();
    const quoteId = String(row?.quoteId || "").trim();
    if (jobId) {
      setLinkedJobHeader(null);
      setLinkedJobId(jobId);
      return;
    }
    if (quoteId) setOpenQuoteId(quoteId);
  }, []);

  const closeLinkedJobModal = useCallback(() => {
    setLinkedJobId(null);
    setLinkedJobHeader(null);
  }, []);

  const columns = useMemo(
    () => [
      {
        key: "actions",
        label: "",
        width: 72,
        minWidth: 72,
        maxWidth: 80,
        render: (_, row) => (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => openEditModal(row)}
              className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Edit purchase order"
              title="Edit"
            >
              <FiEdit2 className="h-4 w-4 shrink-0" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => handleDeletePo(row)}
              className="rounded p-1.5 text-danger hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-danger"
              aria-label="Delete purchase order"
              title="Delete"
            >
              <FiTrash2 className="h-4 w-4 shrink-0" aria-hidden />
            </button>
          </div>
        ),
      },
      {
        key: "poNumber",
        label: "PO #",
        sortable: true,
        render: (_, row) =>
          row?.id ? (
            <button
              type="button"
              onClick={() => openViewModal(row)}
              className={PO_RECORD_LINK_CLASS}
            >
              {row.poNumber || "—"}
            </button>
          ) : (
            row.poNumber || "—"
          ),
      },
      {
        key: "createdAt",
        label: "PO Date",
        sortable: true,
        render: (_, row) => formatDateMdy(row.createdAt),
      },
      {
        key: "vendor",
        label: "Vendor",
        sortable: true,
        render: (_, row) => {
          const vendorId = String(row.vendorId || "").trim();
          const name = row.vendorName || vendorNameMap[vendorId] || vendorId || "—";
          if (!vendorId || name === "—") return name;
          return (
            <button
              type="button"
              className={PO_RECORD_LINK_CLASS}
              onClick={(e) => {
                e.stopPropagation();
                setOpenVendorId(vendorId);
              }}
              title="Open vendor"
            >
              {name}
            </button>
          );
        },
      },
      {
        key: "type",
        label: "Type",
        sortable: true,
        render: (_, row) => (row.type === "job" ? "Job PO" : "Shop PO"),
      },
      {
        key: "status",
        label: "PO status",
        sortable: true,
        render: (_, row) => (
          <Badge variant={STATUS_VARIANT[row.status] || "default"} className="rounded-full px-2.5 py-0.5 text-xs">
            {row.status ?? "Open"}
          </Badge>
        ),
      },
      {
        key: "rfqNumber",
        label: "Job #",
        sortable: true,
        render: (_, row) => {
          if (row.type !== "job") return "—";
          const label = row.rfqNumber || "—";
          if (label === "—") return "—";
          const jobId = String(row.repairFlowJobId || "").trim();
          const quoteId = String(row.quoteId || "").trim();
          if (!jobId && !quoteId) return label;
          return (
            <button
              type="button"
              className={PO_RECORD_LINK_CLASS}
              onClick={(e) => {
                e.stopPropagation();
                openPoJobLink(row);
              }}
              title={jobId ? "Open repair job" : "Open RFQ"}
            >
              {label}
            </button>
          );
        },
      },
      {
        key: "customerName",
        label: "Customer",
        render: (_, row) => {
          if (row.type !== "job") return "—";
          const name = row.customerName || "—";
          const customerId = String(row.customerId || "").trim();
          if (!customerId || name === "—") return name;
          return (
            <button
              type="button"
              className={PO_RECORD_LINK_CLASS}
              onClick={(e) => {
                e.stopPropagation();
                setOpenCustomerId(customerId);
              }}
              title="Open customer"
            >
              {name}
            </button>
          );
        },
      },
      {
        key: "deliveryStatus",
        label: "Delivered",
        sortable: true,
        render: (_, row) => (
          <Badge variant={DELIVERY_STATUS_VARIANT[row.deliveryStatus] || "default"} className="rounded-full px-2.5 py-0.5 text-xs">
            {row.deliveryStatus ?? "—"}
          </Badge>
        ),
      },
      {
        key: "invoicedStatus",
        label: "Invoiced",
        sortable: true,
        render: (_, row) => (
          <Badge variant={INVOICED_STATUS_VARIANT[row.invoicedStatus] || "default"} className="rounded-full px-2.5 py-0.5 text-xs">
            {row.invoicedStatus ?? "—"}
          </Badge>
        ),
      },
      {
        key: "paidStatus",
        label: "Paid",
        sortable: true,
        render: (_, row) => (
          <Badge variant={PAID_STATUS_VARIANT[row.paidStatus] || "default"} className="rounded-full px-2.5 py-0.5 text-xs">
            {row.paidStatus ?? "—"}
          </Badge>
        ),
      },
      {
        key: "totalOrder",
        label: "Order total",
        sortable: true,
        align: "right",
        render: (_, row) => (
          <span className="tabular-nums">
            {row.grandTotal || row.totalOrder ? fmt(row.grandTotal || row.totalOrder) : "—"}
          </span>
        ),
      },
      {
        key: "totalInvoiced",
        label: "Vendor invoiced",
        sortable: true,
        align: "right",
        render: (_, row) => (
          <span className="tabular-nums">{row.totalInvoiced ? fmt(row.totalInvoiced) : "—"}</span>
        ),
      },
      {
        key: "totalPaid",
        label: "Paid",
        sortable: true,
        align: "right",
        render: (_, row) => (
          <span className="tabular-nums">{row.totalPaid ? fmt(row.totalPaid) : "—"}</span>
        ),
      },
    ],
    [vendorNameMap, fmt, handleDeletePo, openEditModal, openViewModal, openPoJobLink]
  );

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-border pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-title">Purchase orders</h1>
          <Button variant="primary" onClick={openCreateModal} className="shrink-0">
            Create Purchase Order
          </Button>
        </div>
        <p className="mt-1 text-sm text-secondary">
          Vendor POs with invoices, receipts, and payments.
        </p>
      </div>

      <div className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="mb-2 flex shrink-0 flex-wrap gap-1.5">
          {poTypeSummaryCards.map((card) => (
            <StatusFilterPillButton
              key={card.key || "__all__"}
              card={card}
              active={(poTypeFilter || "") === (card.key || "")}
              onClick={() => {
                setPage(1);
                setPoTypeFilter(card.key || "");
              }}
              formatAmount={fmt}
            />
          ))}
        </div>
        <Table
          columns={columns}
          data={pos}
          rowKey="id"
          loading={loading}
          emptyMessage={
            poTypeFilter === "shop"
              ? "No shop purchase orders match your filters."
              : poTypeFilter === "job"
                ? "No job purchase orders match your filters."
                : pos.length === 0
                  ? "No purchase orders yet. Use “Create Purchase Order” to add one."
                  : "No purchase orders match the search."
          }
          searchable
          onSearch={(q) => {
            setPage(1);
            setSearchQuery(q);
          }}
          searchPlaceholder="Search PO #, vendor, job #, customer, status…"
          onRefresh={async () => { setLoading(true); await loadPos(); setLoading(false); }}
          sortState={tableSort}
          onSort={handleTableSort}
          responsive
          pagination={{ page, pageSize, totalCount }}
          onPageChange={(nextPage, nextPageSize) => {
            setPage(nextPage);
            setPageSize(nextPageSize);
          }}
          paginateClientSide={false}
        />
      </div>

      {/* Create PO modal */}
      <Modal
        open={createModalOpen}
        onClose={closeCreateModal}
        title="Create Purchase Order"
        size="4xl"
        actions={
          <Button type="submit" form="create-po-form" variant="primary" size="sm" disabled={savingPo}>
            {savingPo ? "Saving…" : "Save"}
          </Button>
        }
      >
        <Form id="create-po-form" onSubmit={handleCreateSubmit} className={`${FORM_SECTIONS_STACK_CLASS} !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none`}>
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

      {/* Add Vendor modal (from Create PO) */}
      <Modal
        open={addVendorModalOpen}
        onClose={closeAddVendorModal}
        title="Add Vendor"
        size="4xl"
        actions={
          <Button type="submit" form="add-vendor-form" variant="primary" size="sm" disabled={savingVendor}>
            {savingVendor ? "Saving…" : "Save"}
          </Button>
        }
      >
        <Form id="add-vendor-form" onSubmit={handleAddVendorSubmit} className={`${FORM_SECTIONS_STACK_CLASS} !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none`}>
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

      {/* View PO modal */}
      <Modal
        open={viewModalOpen}
        onClose={closeViewModal}
        title={viewingPo?.poNumber ? `Purchase order ${viewingPo.poNumber}` : "Purchase order"}
        size="4xl"
        headerClassName="flex-wrap items-center gap-2"
        actions={
          viewingPo?.id && !viewLoadingPoId ? (
            <div className="flex max-w-full flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap"
                onClick={openRecordPaymentModal}
              >
                Record payment
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap"
                onClick={openAttachInvoiceModal}
              >
                Attach vendor invoice
              </Button>
              <span className="hidden h-6 w-px shrink-0 bg-border sm:block" aria-hidden />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="inline-flex shrink-0 items-center gap-1.5"
                onClick={() => openDocsPoModal(viewingPo)}
              >
                <FiPaperclip className="h-4 w-4 shrink-0" aria-hidden />
                Documents
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="inline-flex shrink-0 items-center gap-1.5"
                onClick={() => setPrintPoId(viewingPo.id)}
              >
                <FiPrinter className="h-4 w-4 shrink-0" aria-hidden />
                Print
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={sendEmailPreview?.poId === viewingPo.id}
                className="inline-flex shrink-0 items-center gap-1.5"
                onClick={() => handleSendToVendor(viewingPo)}
              >
                <FiSend className="h-4 w-4 shrink-0" aria-hidden />
                Send
              </Button>
            </div>
          ) : null
        }
      >
        {viewLoadingPoId ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <span
              className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary"
              aria-hidden
            />
            <span className="text-sm text-secondary">Loading purchase order…</span>
          </div>
        ) : viewingPo ? (
          <>
            <PoViewDetailBody
              viewingPo={viewingPo}
              vendorName={vendorNameMap[viewingPo.vendorId] || viewingPo.vendorId || "—"}
              onOpenVendor={(vendorId) => setOpenVendorId(String(vendorId || "").trim() || null)}
              onOpenJobLink={openPoJobLink}
              jobLabel={(() => {
                const jid = String(viewingPo.repairFlowJobId || "").trim();
                if (jid) {
                  const j = repairJobs.find((x) => String(x.id) === jid);
                  if (j?.jobNumber) return String(j.jobNumber).trim();
                }
                if (viewingPo.quoteId) {
                  return quotes.find((q) => q.id === viewingPo.quoteId)?.rfqNumber || viewingPo.quoteId;
                }
                return "—";
              })()}
              fmt={fmt}
              accountSettings={accountSettings}
            />
            {(Number(viewingPo.attachmentCount) > 0 ||
              (Array.isArray(viewingPo.attachments) && viewingPo.attachments.length > 0)) && (
                <div className={`${poViewPanel} mt-4 flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5`}>
                  <div>
                    <h3 className="text-sm font-bold text-title">Documents</h3>
                    <p className="mt-0.5 text-xs text-secondary">
                      {viewingPo.attachmentCount || viewingPo.attachments?.length || 0} file(s) attached
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => openDocsPoModal(viewingPo)}>
                    <FiPaperclip className="h-4 w-4 shrink-0" aria-hidden />
                    View documents
                  </Button>
                </div>
              )}
            {(viewingPo.notes || "").trim() ? (
              <div className={`${poViewPanel} mt-4 p-4 sm:p-5`}>
                <h3 className={`mb-2 ${poViewSectionTitle}`}>Notes</h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-title">{viewingPo.notes}</p>
              </div>
            ) : null}
          </>
        ) : null}
      </Modal>

      {/* Attach Vendor Invoice modal */}
      <Modal
        open={attachInvoiceOpen}
        onClose={closeAttachInvoiceModal}
        title={editingVendorInvoiceIndex != null ? "Edit vendor invoice" : "Attach vendor invoice"}
        size="2xl"
        actions={
          <>
            {editingVendorInvoiceIndex != null ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={savingInvoice || uploadingInvoiceFile}
                onClick={() => {
                  setEditingVendorInvoiceIndex(null);
                  setInvoiceForm(emptyInvoiceForm(todayString()));
                  if (invoiceFileInputRef.current) invoiceFileInputRef.current.value = "";
                }}
              >
                Cancel edit
              </Button>
            ) : null}
            <Button
              type="submit"
              form="attach-invoice-form"
              variant="primary"
              size="sm"
              disabled={savingInvoice || uploadingInvoiceFile}
            >
              {savingInvoice ? "Saving…" : editingVendorInvoiceIndex != null ? "Update" : "Attach"}
            </Button>
          </>
        }
      >
        <Form id="attach-invoice-form" onSubmit={handleAttachInvoice} className={`${FORM_SECTIONS_STACK_CLASS} !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none`}>
          <Input
            label="Invoice number"
            value={invoiceForm.invoiceNumber}
            onChange={(e) => setInvoiceForm((f) => ({ ...f, invoiceNumber: e.target.value }))}
            placeholder="Vendor invoice #"
          />
          <Input
            label="Date"
            type="date"
            value={invoiceForm.date}
            onChange={(e) => setInvoiceForm((f) => ({ ...f, date: e.target.value }))}
          />
          <Input
            label="Amount"
            type="number"
            step="0.01"
            value={invoiceForm.amount}
            onChange={(e) => setInvoiceForm((f) => ({ ...f, amount: e.target.value }))}
            placeholder="0.00"
            inputClassName="text-right tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-title">Invoice file (optional)</label>
            <input
              ref={invoiceFileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx"
              onChange={handleInvoiceFileChange}
              disabled={uploadingInvoiceFile}
              className="block w-full text-sm text-title file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:text-white file:hover:opacity-90"
            />
            {uploadingInvoiceFile && <p className="mt-1 text-xs text-secondary">Uploading…</p>}
            {invoiceForm.attachmentName && !uploadingInvoiceFile && (
              <p className="mt-1 flex items-center gap-2 text-sm text-title">
                <span className="truncate">{invoiceForm.attachmentName}</span>
                <button
                  type="button"
                  onClick={() => setInvoiceForm((f) => ({ ...f, attachmentUrl: "", attachmentName: "" }))}
                  className="shrink-0 text-secondary hover:text-danger focus:outline-none"
                  aria-label="Remove file"
                >
                  Remove
                </button>
              </p>
            )}
          </div>
          {viewingPo && (
            <div className="border-t border-border pt-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Vendor invoices</h3>
              {Array.isArray(viewingPo.vendorInvoices) && viewingPo.vendorInvoices.length > 0 ? (
                <div className="overflow-x-auto rounded border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-card">
                      <tr>
                        <th className="w-0 px-2 py-2 text-left text-secondary">
                          <span className="sr-only">Actions</span>
                        </th>
                        <th className="px-3 py-2 text-left text-secondary">Invoice #</th>
                        <th className="px-3 py-2 text-left text-secondary">Date</th>
                        <th className="px-3 py-2 text-right text-secondary">Amount</th>
                        <th className="px-3 py-2 text-left text-secondary">File</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingPo.vendorInvoices.map((inv, i) => (
                        <tr
                          key={i}
                          className={`border-t border-border ${editingVendorInvoiceIndex === i ? "bg-primary/5" : ""}`}
                        >
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={savingInvoice || uploadingInvoiceFile}
                                onClick={() => handleEditVendorInvoice(i)}
                                className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                                aria-label="Edit vendor invoice"
                                title="Edit"
                              >
                                <FiEdit2 className="h-4 w-4 shrink-0" aria-hidden />
                              </button>
                              <button
                                type="button"
                                disabled={savingInvoice || uploadingInvoiceFile}
                                onClick={() => handleDeleteVendorInvoice(i)}
                                className="rounded p-1.5 text-danger hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-danger disabled:opacity-50"
                                aria-label="Delete vendor invoice"
                                title="Delete"
                              >
                                <FiTrash2 className="h-4 w-4 shrink-0" aria-hidden />
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-title">{inv?.invoiceNumber || "—"}</td>
                          <td className="px-3 py-2 text-secondary">{inv?.date || "—"}</td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums text-title">{fmt(inv?.amount || 0)}</td>
                          <td className="px-3 py-2">
                            {inv?.attachmentUrl ? (
                              <a href={inv.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                {inv?.attachmentName || "View file"}
                              </a>
                            ) : (
                              <span className="text-secondary">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-secondary">No vendor invoices attached yet.</p>
              )}
              <p className="mt-1 text-right text-sm tabular-nums text-secondary">
                Total invoiced: {fmt(viewingPo.totalInvoiced || 0)}
              </p>
            </div>
          )}
        </Form>
      </Modal>

      {/* Record Payment modal */}
      <Modal
        open={recordPaymentOpen}
        onClose={closeRecordPaymentModal}
        title={editingPaymentIndex != null ? "Edit payment" : "Record payment"}
        size="2xl"
        actions={
          <>
            {editingPaymentIndex != null ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={savingPayment}
                onClick={() => {
                  setEditingPaymentIndex(null);
                  setPaymentForm(emptyPaymentForm(todayString(), defaultPaymentAmount(viewingPo)));
                }}
              >
                Cancel edit
              </Button>
            ) : null}
            <Button type="submit" form="record-payment-form" variant="primary" size="sm" disabled={savingPayment}>
              {savingPayment ? "Saving…" : editingPaymentIndex != null ? "Update" : "Record"}
            </Button>
          </>
        }
      >
        <Form id="record-payment-form" onSubmit={handleRecordPayment} className={`${FORM_SECTIONS_STACK_CLASS} !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none`}>
          <Input
            label="Amount"
            type="number"
            step="0.01"
            value={paymentForm.amount}
            onChange={(e) => setPaymentForm((f) => ({ ...f, amount: e.target.value }))}
            placeholder="0.00"
            help={
              editingPaymentIndex == null && viewingPo
                ? `Balance due: ${fmt(balanceDueForPo(viewingPo) || 0)}${sumVendorInvoiced(viewingPo) > 0 ? " (vendor invoices)" : " (PO total)"
                }`
                : undefined
            }
          />
          <Input
            label="Date"
            type="date"
            value={paymentForm.date}
            onChange={(e) => setPaymentForm((f) => ({ ...f, date: e.target.value }))}
          />
          <Input
            label="Method"
            value={paymentForm.method}
            onChange={(e) => setPaymentForm((f) => ({ ...f, method: e.target.value }))}
            placeholder="e.g. Check, ACH, Card"
          />
          <Input
            label="Reference"
            value={paymentForm.reference}
            onChange={(e) => setPaymentForm((f) => ({ ...f, reference: e.target.value }))}
            placeholder="Check #, transaction ID"
          />
          {viewingPo && (
            <div className="border-t border-border pt-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Payments</h3>
              {Array.isArray(viewingPo.payments) && viewingPo.payments.length > 0 ? (
                <div className="overflow-x-auto rounded border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-card">
                      <tr>
                        <th className="w-0 px-2 py-2 text-left text-secondary">
                          <span className="sr-only">Actions</span>
                        </th>
                        <th className="px-3 py-2 text-right text-secondary">Amount</th>
                        <th className="px-3 py-2 text-left text-secondary">Date</th>
                        <th className="px-3 py-2 text-left text-secondary">Method</th>
                        <th className="px-3 py-2 text-left text-secondary">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingPo.payments.map((pay, i) => (
                        <tr
                          key={i}
                          className={`border-t border-border ${editingPaymentIndex === i ? "bg-primary/5" : ""}`}
                        >
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={savingPayment}
                                onClick={() => handleEditPayment(i)}
                                className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                                aria-label="Edit payment"
                                title="Edit"
                              >
                                <FiEdit2 className="h-4 w-4 shrink-0" aria-hidden />
                              </button>
                              <button
                                type="button"
                                disabled={savingPayment}
                                onClick={() => handleDeletePayment(i)}
                                className="rounded p-1.5 text-danger hover:bg-danger/10 focus:outline-none focus:ring-2 focus:ring-danger disabled:opacity-50"
                                aria-label="Delete payment"
                                title="Delete"
                              >
                                <FiTrash2 className="h-4 w-4 shrink-0" aria-hidden />
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-title">{fmt(pay?.amount || 0)}</td>
                          <td className="px-3 py-2 text-secondary">{pay?.date || "—"}</td>
                          <td className="px-3 py-2 text-title">{pay?.method || "—"}</td>
                          <td className="px-3 py-2 text-secondary">{pay?.reference || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-secondary">No payments recorded yet.</p>
              )}
              <p className="mt-1 text-sm text-secondary">Total paid: {fmt(viewingPo.totalPaid || 0)}</p>
            </div>
          )}
        </Form>
      </Modal>

      {/* Edit PO modal */}
      <Modal
        open={editModalOpen}
        onClose={closeEditModal}
        title="Edit purchase order"
        size="4xl"
        actions={
          <Button type="submit" form="edit-po-form" variant="primary" size="sm" disabled={savingPo}>
            {savingPo ? "Saving…" : "Save"}
          </Button>
        }
      >
        <Form id="edit-po-form" onSubmit={handleEditSubmit} className={`${FORM_SECTIONS_STACK_CLASS} !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none`}>
          <FormSection title="Vendor & type">
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                label="Vendor"
                options={vendorOptions}
                value={form.vendorId}
                onChange={(e) => setForm((f) => ({ ...f, vendorId: e.target.value ?? "" }))}
                placeholder="Select vendor"
                searchable
                className="lg:col-span-2"
              />
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
            <PoLineItemsTotalsTable
              lines={form.lineItems}
              otherCharges={viewingPo?.otherCharges}
              fmt={fmt}
            />
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
            resourceId={viewingPo?.id || null}
            vendorId={null}
            attachments={form.attachments}
            onAttachmentsChange={(next) => setForm((f) => ({ ...f, attachments: next }))}
            pendingFiles={[]}
            onPendingFilesChange={() => { }}
            uploading={attachmentPoUploading}
            onPickFilesForUpload={handlePoFileUpload}
          />
        </Form>
      </Modal>

      <Modal
        open={docsPoModalOpen}
        onClose={closeDocsPoModal}
        title={docsPoMeta ? `Documents — PO ${docsPoMeta.label}` : "Documents"}
        size="lg"
      >
        {docsPoLoading ? (
          <div className="flex justify-center py-10">
            <span className="text-secondary">Loading…</span>
          </div>
        ) : (
          <VendorAttachmentsPanel
            title="Attachments"
            resourceLabel="purchase order"
            resourceId={docsPoMeta?.id || null}
            vendorId={null}
            attachments={docsPoAttachments}
            onAttachmentsChange={setDocsPoAttachments}
            pendingFiles={[]}
            onPendingFilesChange={() => { }}
            uploading={docsPoSaving}
            hideUpload
            onRemoveSavedRow={handleDocsPoRemoveRow}
          />
        )}
      </Modal>

      <DocumentPrintPreviewModal
        documentType="po"
        documentId={printPoId}
        open={!!printPoId}
        onClose={() => setPrintPoId(null)}
      />

      <VendorQuickViewModal
        open={!!openVendorId}
        vendorId={openVendorId}
        onClose={() => setOpenVendorId(null)}
        zIndex={120}
      />

      <CustomerQuickViewModal
        open={!!openCustomerId}
        customerId={openCustomerId}
        onClose={() => setOpenCustomerId(null)}
        zIndex={120}
      />

      <QuoteQuickViewModal
        open={!!openQuoteId}
        quoteId={openQuoteId}
        onClose={() => setOpenQuoteId(null)}
        zIndex={120}
      />

      <Modal
        open={!!linkedJobId}
        onClose={closeLinkedJobModal}
        title={
          linkedJobHeader?.jobNumber
            ? `${linkedJobHeader.jobNumber} · ${linkedJobHeader.customerLabel || "Customer"}`
            : "Repair job"
        }
        width="min(1200px, 94vw)"
        zIndex={115}
        actions={
          <Button type="button" variant="outline" size="sm" onClick={closeLinkedJobModal}>
            Close
          </Button>
        }
      >
        <div className="w-full min-w-0 max-w-none">
          {linkedJobId ? (
            <RepairFlowJobDetailClient
              key={linkedJobId}
              jobId={linkedJobId}
              variant="modal"
              onClose={closeLinkedJobModal}
              onJobMeta={setLinkedJobHeader}
            />
          ) : null}
        </div>
      </Modal>

      <SendDocumentPreviewModal
        open={!!sendEmailPreview?.poId}
        onClose={() => setSendEmailPreview(null)}
        title={
          sendEmailPreview?.poNumber
            ? `Send PO ${sendEmailPreview.poNumber} to vendor`
            : "Send purchase order to vendor"
        }
        documentType="po"
        documentId={sendEmailPreview?.poId || null}
        sendUrl={
          sendEmailPreview?.poId
            ? `/api/dashboard/purchase-orders/${sendEmailPreview.poId}/send`
            : null
        }
        onSent={() => {
          setSendEmailPreview(null);
          loadPos();
        }}
        zIndex={130}
      />
    </div>
  );
}
