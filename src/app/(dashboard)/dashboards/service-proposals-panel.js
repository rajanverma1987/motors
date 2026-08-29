"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useSimpleOpenParam } from "@/hooks/use-simple-open-param";
import {
  FiCheckCircle,
  FiClipboard,
  FiFileText,
  FiLayers,
  FiPackage,
  FiPlus,
  FiTool,
  FiX,
  FiXCircle,
} from "react-icons/fi";
import Table from "@/components/ui/table";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Textarea from "@/components/ui/textarea";
import StatusFilterPillButton from "@/components/dashboard/status-filter-pill-button";
import CustomerViewModal from "@/components/dashboard/customer-view-modal";
import ServiceProposalFormModal from "@/components/simple/service-proposal-form-modal";
import {
  SIMPLE_SCREEN_FILTERS_CLASS,
  SIMPLE_SCREEN_PANEL_CLASS,
  SIMPLE_SCREEN_TABLE_WRAP_CLASS,
} from "@/lib/simple-screen-ui";
import SimpleSelect from "@/components/simple/simple-select";
import { useConfirm, useAlert } from "@/components/confirm-provider";
import { useFormatDate, usePreferredTablePageSize, useUserSettings } from "@/contexts/user-settings-context";
import {
  invoiceStatusSelectOptionsFromMerged,
  invoiceStatusTileColorForValue,
  quoteStatusSelectOptionsFromMerged,
  quoteStatusTileColorForValue,
  buildCombinedQuoteInvoiceStatusOptions,
  buildQuoteStatusFilterCardSpecs,
  resolveConfiguredStatusSlug,
  workOrderStatusSelectOptionsFromMerged,
  otherStatusTileColorForValue,
  OTHER_STATUS_ALL,
} from "@/lib/dropdown-catalog";
import { resolveStatusTileProps, resolveWorkOrderStatusTileProps } from "@/lib/work-order-status-tiles";
import { mergeUserSettings } from "@/lib/user-settings";
import { fetchAllPaginatedDashboardItems } from "@/lib/fetch-all-paginated-dashboard-items";
import { resolveEmployeeDisplayName } from "@/lib/technician-select-options";
import { parseAllJobsDateRange } from "@/lib/all-jobs-date-filter";
import {
  formatSimpleMoney,
  formToServiceProposalListRow,
  toSimpleServiceProposalListRow,
  isSimpleInvoiceRecord,
  RECORD_TYPE_RFQ,
  resolveRecordTypeOnSave,
} from "@/lib/simple-service-proposal-form";
import {
  deleteSimpleServiceProposal,
  fetchSimpleServiceProposal,
  fetchSimpleServiceProposalsPage,
  saveSimpleServiceProposal,
} from "@/lib/simple-portal-api";
import {
  INVOICE_FILTER_AMOUNT_RECEIVABLE,
  INVOICE_FILTER_TAX_COLLECTED,
  INVOICE_FILTER_TAX_TO_BE_COLLECTED,
} from "@/lib/invoice-tax-collected";

const FILTER_AMOUNT_RECEIVABLE = INVOICE_FILTER_AMOUNT_RECEIVABLE;
const FILTER_TAX_COLLECTED = INVOICE_FILTER_TAX_COLLECTED;
const FILTER_TAX_TO_COLLECT = INVOICE_FILTER_TAX_TO_BE_COLLECTED;

export const SIMPLE_LIST_VARIANT_PROPOSALS = "proposals";
export const SIMPLE_LIST_VARIANT_INVOICES = "invoices";

const NOTES_EDIT_FORM_ID = "simple-proposal-notes-edit-form";

const EMPTY_INVOICE_FINANCE = {
  amountReceivable: { count: 0, amount: 0 },
  taxCollected: { count: 0, amount: 0 },
  taxToCollect: { count: 0, amount: 0 },
};

function statusBareKey(status) {
  return String(status || "")
    .trim()
    .toLowerCase()
    .replace(/^invoice:/, "");
}

/** Match Invoices-panel statusOptions encoding (`invoice:` only when slug also exists in quote). */
function toInvoiceStatusSelectValue(status, quoteStatusValues) {
  const bare = statusBareKey(status);
  if (!bare) return "";
  const quoteValues = new Set(
    (Array.isArray(quoteStatusValues) ? quoteStatusValues : []).map((v) =>
      String(v || "")
        .trim()
        .toLowerCase()
    )
  );
  return quoteValues.has(bare) ? `invoice:${bare}` : bare;
}

function statusCardIcon(label) {
  const l = String(label || "").toLowerCase();
  if (!l || l === "all") return FiLayers;
  if (l.includes("receivable")) return FiClipboard;
  if (l.includes("tax collected") && !l.includes("to be")) return FiCheckCircle;
  if (l.includes("tax to be")) return FiClipboard;
  if (l.includes("reject")) return FiXCircle;
  if (l.includes("approv") || l.includes("accept") || l.includes("closed")) return FiCheckCircle;
  if (l.includes("bill") || l.includes("invoice") || l.includes("paid")) return FiClipboard;
  if (l.includes("warranty")) return FiTool;
  if (l.includes("rnr") || l.includes("return")) return FiPackage;
  return FiFileText;
}

function resolveRowStatusPill(status, mergedSettings, quoteOpts, invoiceOpts) {
  const raw = String(status || "").trim();
  if (!raw) return null;
  const bare = statusBareKey(raw);
  const isInvoiceOpt = raw.toLowerCase().startsWith("invoice:");
  const quoteIdx = quoteOpts.findIndex((o) => String(o.value).toLowerCase() === bare);
  const invIdx = invoiceOpts.findIndex((o) => String(o.value).toLowerCase() === bare);
  const useInvoice = isInvoiceOpt || (invIdx >= 0 && quoteIdx < 0);
  const { tileColor, tileBgColor, tileTextColor, index } = useInvoice
    ? invoiceStatusTileColorForValue(mergedSettings, bare, invIdx >= 0 ? invIdx : 0)
    : quoteStatusTileColorForValue(mergedSettings, bare, quoteIdx >= 0 ? quoteIdx : 0);
  const pill = resolveStatusTileProps(tileColor, index, { tileBgColor, tileTextColor, tileColor });
  const label =
    (useInvoice ? invoiceOpts : quoteOpts).find((o) => String(o.value).toLowerCase() === bare)?.label ||
    raw.replace(/^invoice:/i, "");
  return { style: pill.style, className: pill.className || "", label };
}

/** Full-cell status highlight (flush to cell edges; keep control padding inside). */
function proposalStatusCellChrome(row, mergedSettings, quoteOpts, invoiceOpts) {
  const resolved = resolveRowStatusPill(row?.status, mergedSettings, quoteOpts, invoiceOpts);
  if (!resolved) return { style: null, className: "" };
  return {
    style: resolved.style || null,
    className: `!p-0 ${resolved.className || ""}`.trim(),
  };
}

function jobStatusCellChrome(row, jobStatusOptions, workOrderStatusTileColors) {
  const current = String(row?.jobStatus || "").trim();
  if (!current) return { style: null, className: "!p-0" };
  const idx = (jobStatusOptions || []).findIndex(
    (o) => String(o.value).toLowerCase() === current.toLowerCase()
  );
  const pill = resolveWorkOrderStatusTileProps(
    current,
    idx >= 0 ? idx : 0,
    workOrderStatusTileColors || {}
  );
  return {
    style: pill.style || null,
    className: `!p-0 ${pill.className || ""}`.trim(),
  };
}

export default function ServiceProposalsPanel({
  variant = SIMPLE_LIST_VARIANT_PROPOSALS,
  createNonce = 0,
}) {
  const isInvoices = variant === SIMPLE_LIST_VARIANT_INVOICES;
  const alert = useAlert();
  const confirm = useConfirm();
  const searchParams = useSearchParams();
  const { settings } = useUserSettings();
  const formatDate = useFormatDate();
  const mergedSettings = useMemo(() => mergeUserSettings(settings), [settings]);
  const { from: dateFrom, to: dateTo } = parseAllJobsDateRange(searchParams);

  const [rows, setRows] = useState([]);
  const [ready, setReady] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [notesEdit, setNotesEdit] = useState(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [openCustomerId, setOpenCustomerId] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [tableSort, setTableSort] = useState({ key: "date", direction: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePreferredTablePageSize();
  const [totalCount, setTotalCount] = useState(0);
  const [statusBuckets, setStatusBuckets] = useState([]);
  const [listTotals, setListTotals] = useState({ total: 0, taxCollected: 0, count: 0 });
  const [invoiceFinance, setInvoiceFinance] = useState(EMPTY_INVOICE_FINANCE);
  /** Ignore stale createNonce when Tabs remount this panel on tab switch. */
  const lastHandledCreateNonceRef = useRef(createNonce);

  const quoteOpts = useMemo(
    () => quoteStatusSelectOptionsFromMerged(mergedSettings),
    [mergedSettings]
  );
  const invoiceOpts = useMemo(
    () => invoiceStatusSelectOptionsFromMerged(mergedSettings),
    [mergedSettings]
  );

  const quoteStatusValues = useMemo(
    () => quoteOpts.map((o) => String(o.value || "").trim()).filter(Boolean),
    [quoteOpts]
  );
  const invoiceStatusValues = useMemo(
    () => invoiceOpts.map((o) => String(o.value || "").trim()).filter(Boolean),
    [invoiceOpts]
  );

  const statusOptionsForCards = useMemo(() => {
    if (isInvoices) {
      const quoteValues = new Set(quoteStatusValues.map((v) => v.toLowerCase()));
      return invoiceOpts.map((o) => {
        const value = String(o.value || "").trim();
        const lower = value.toLowerCase();
        return {
          value: quoteValues.has(lower) ? `invoice:${lower}` : value,
          label: o.label || o.value,
        };
      });
    }
    return quoteOpts.map((o) => ({
      value: String(o.value || "").trim(),
      label: o.label || o.value,
    }));
  }, [isInvoices, quoteOpts, invoiceOpts, quoteStatusValues]);

  const statusOptions = useMemo(() => {
    if (isInvoices) {
      const quoteValues = new Set(quoteStatusValues.map((v) => v.toLowerCase()));
      return invoiceOpts.map((o) => {
        const value = String(o.value || "").trim();
        const lower = value.toLowerCase();
        return {
          value: quoteValues.has(lower) ? `invoice:${lower}` : value,
          label: o.label || o.value,
        };
      });
    }
    return buildCombinedQuoteInvoiceStatusOptions(mergedSettings);
  }, [isInvoices, invoiceOpts, quoteStatusValues, mergedSettings]);

  const jobStatusOptions = useMemo(
    () => workOrderStatusSelectOptionsFromMerged(mergedSettings),
    [mergedSettings]
  );

  const openCreate = useCallback(() => {
    setEditingId(null);
    setModalOpen(true);
  }, []);

  useEffect(() => {
    if (!createNonce || isInvoices) return;
    if (createNonce === lastHandledCreateNonceRef.current) return;
    lastHandledCreateNonceRef.current = createNonce;
    openCreate();
  }, [createNonce, isInvoices, openCreate]);

  const reload = useCallback(async () => {
    setReady(false);
    try {
      const [pageData, cust, emps] = await Promise.all([
        fetchSimpleServiceProposalsPage({
          page,
          pageSize,
          q: searchQuery,
          sortBy: tableSort?.key || "date",
          sortDir: tableSort?.direction || "desc",
          listKind: isInvoices ? "invoices" : "proposals",
          status: statusFilter,
          from: dateFrom,
          to: dateTo,
        }),
        fetchAllPaginatedDashboardItems("/api/dashboard/customers"),
        fetchAllPaginatedDashboardItems("/api/dashboard/employees"),
      ]);
      const customersList = Array.isArray(cust) ? cust : [];
      const byId = new Map(customersList.map((c) => [String(c.id || ""), c]));
      const employeesList = Array.isArray(emps) ? emps : [];
      const normalized = (Array.isArray(pageData.items) ? pageData.items : []).map((doc) => {
        const customer = byId.get(String(doc?.customerId || "").trim()) || null;
        const preparedByRaw = String(doc?.preparedBy || doc?.quotedBy || "").trim();
        return toSimpleServiceProposalListRow(
          {
            ...doc,
            status: resolveConfiguredStatusSlug(doc?.status, mergedSettings),
          },
          {
            companyName: customer?.companyName || doc?.companyName || "",
            phone: customer?.phone || doc?.phone || doc?.customerPhone || "",
            email: customer?.email || doc?.email || doc?.customerEmail || "",
            preparedByLabel: resolveEmployeeDisplayName(employeesList, preparedByRaw),
          }
        );
      });
      setRows(normalized);
      setTotalCount(Number(pageData.totalCount) || 0);
      setStatusBuckets(Array.isArray(pageData.statusBuckets) ? pageData.statusBuckets : []);
      setListTotals(pageData.totals || { total: 0, taxCollected: 0, count: 0 });
      setInvoiceFinance(pageData.invoiceFinance || EMPTY_INVOICE_FINANCE);
      setCustomers(customersList);
      setEmployees(employeesList);
    } catch {
      setRows([]);
      setTotalCount(0);
      setStatusBuckets([]);
      setListTotals({ total: 0, taxCollected: 0, count: 0 });
      setInvoiceFinance(EMPTY_INVOICE_FINANCE);
    } finally {
      setReady(true);
    }
  }, [
    mergedSettings,
    page,
    pageSize,
    searchQuery,
    tableSort,
    isInvoices,
    statusFilter,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo]);

  const employeeLabel = useCallback(
    (id) => resolveEmployeeDisplayName(employees, id),
    [employees]
  );

  const customerName = useCallback(
    (id) => {
      const c = customers.find((row) => row.id === id);
      return c?.companyName || c?.primaryContactName || "";
    },
    [customers]
  );

  const editingRow = useMemo(
    () => (editingId ? rows.find((r) => r.id === editingId) || null : null),
    [editingId, rows]
  );

  const openEdit = (row) => {
    setEditingId(row.id);
    setModalOpen(true);
  };

  const handleDeepLinkOpen = useCallback(
    async (openId) => {
      let row = rows.find((r) => String(r.id) === openId);
      if (!row) {
        try {
          const doc = await fetchSimpleServiceProposal(openId);
          if (doc) {
            row = toSimpleServiceProposalListRow(
              {
                ...doc,
                status: resolveConfiguredStatusSlug(doc?.status, mergedSettings),
              },
              {
                companyName: customerName(doc.customerId) || doc.companyName || "",
                preparedByLabel: resolveEmployeeDisplayName(
                  employees,
                  doc.preparedBy || doc.quotedBy
                ),
              }
            );
          }
        } catch {
          return true;
        }
      }
      if (!row) return true;
      const rowIsInvoice = isSimpleInvoiceRecord(row, invoiceStatusValues, quoteStatusValues);
      if (isInvoices !== rowIsInvoice) return true;
      openEdit(row);
      return true;
    },
    [rows, isInvoices, invoiceStatusValues, quoteStatusValues, mergedSettings, customerName, employees]
  );

  useSimpleOpenParam({
    ready,
    onOpen: handleDeepLinkOpen,
  });

  const handleSave = async (form, options = {}) => {
    const forceNew = options?.forceNew === true;
    const id = forceNew ? undefined : editingId || form.id || undefined;
    let documentNumber = forceNew ? "" : String(form.documentNumber ?? "").trim();
    // Job numbers are assigned on the server from the full DB (not paginated list rows).
    const row = formToServiceProposalListRow(
      { ...form, documentNumber, ...(forceNew ? { id: "", recordType: RECORD_TYPE_RFQ } : {}) },
      {
        id: id || "",
        companyName: customerName(form.customerId) || (forceNew ? "" : editingRow?.companyName) || "",
        preparedByLabel: employeeLabel(form.preparedBy),
      }
    );
    const saved = await saveSimpleServiceProposal(
      { ...row, id: id || undefined },
      { forceNew: forceNew || !id }
    );
    setRows((prev) => {
      const sid = String(saved?.id || "").trim();
      const idx = sid ? prev.findIndex((r) => r.id === sid) : -1;
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...prev[idx], ...saved };
        return next;
      }
      return [saved, ...prev];
    });
    setEditingId(saved.id);
    return saved;
  };

  const handleAttachmentsChange = useCallback((recordId, attachments) => {
    const id = String(recordId || "").trim();
    if (!id) return;
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, attachments: Array.isArray(attachments) ? attachments : [] } : r))
    );
  }, []);

  const handleDelete = useCallback(
    async (row) => {
      const ok = await confirm({
        title: isInvoices ? "Delete invoice" : "Delete service proposal",
        message: `Delete ${row.quote || "this record"}? This cannot be undone.`,
        confirmLabel: "Delete",
        variant: "danger",
      });
      if (!ok) return;
      try {
        await deleteSimpleServiceProposal(row.id);
        setRows((prev) => prev.filter((r) => r.id !== row.id));
        setSelectedRowIds((prev) => prev.filter((id) => id !== row.id));
        await alert({ title: "Deleted", message: isInvoices ? "Invoice deleted." : "Service proposal deleted." });
      } catch (err) {
        await alert({
          title: "Error",
          message: err?.message || "Failed to delete.",
          variant: "danger",
        });
      }
    },
    [confirm, alert, isInvoices]
  );

  const handleRowFieldChange = useCallback((rowId, patch) => {
    const id = String(rowId || "").trim();
    if (!id) return;
    setRows((prev) => {
      const current = prev.find((r) => r.id === id);
      if (!current) return prev;
      const nextRow = { ...current, ...patch };
      void saveSimpleServiceProposal(nextRow).catch(() => {
        /* list stays optimistic; next reload corrects */
      });
      return prev.map((r) => (r.id === id ? nextRow : r));
    });
  }, []);

  const openNotesEdit = useCallback((row) => {
    const id = String(row?.id || "").trim();
    if (!id) return;
    setNotesEdit({ id, quote: String(row?.quote || "").trim() });
    setNotesDraft(String(row?.notes ?? ""));
  }, []);

  const closeNotesEdit = useCallback(() => {
    setNotesEdit(null);
    setNotesDraft("");
  }, []);

  const handleNotesSave = useCallback(
    (e) => {
      e?.preventDefault?.();
      const id = String(notesEdit?.id || "").trim();
      if (!id) return;
      handleRowFieldChange(id, { notes: notesDraft });
      closeNotesEdit();
    },
    [notesEdit, notesDraft, handleRowFieldChange, closeNotesEdit]
  );

  const handleRowStatusChange = useCallback(
    (row, nextStatus) => {
      const nextType = resolveRecordTypeOnSave(
        row.recordType,
        nextStatus,
        invoiceStatusValues,
        quoteStatusValues
      );
      handleRowFieldChange(row.id, { status: nextStatus, recordType: nextType });
    },
    [handleRowFieldChange, invoiceStatusValues, quoteStatusValues]
  );

  const handleRowJobStatusChange = useCallback(
    (row, nextJobStatus) => {
      handleRowFieldChange(row.id, { jobStatus: nextJobStatus });
    },
    [handleRowFieldChange]
  );

  const bucketByStatus = useMemo(() => {
    const map = new Map();
    for (const b of statusBuckets) {
      const key = statusBareKey(b.status);
      const prev = map.get(key) || { count: 0, amount: 0, taxCollected: 0 };
      map.set(key, {
        count: prev.count + (Number(b.count) || 0),
        amount: prev.amount + (Number(b.amount) || 0),
        taxCollected: prev.taxCollected + (Number(b.taxCollected) || 0),
      });
    }
    return map;
  }, [statusBuckets]);

  const statusSummaryCards = useMemo(() => {
    const tileAppearanceForKey = (statusKey, fallbackIndex) => {
      if (statusKey === "") return resolveStatusTileProps("", 0);
      const bare = statusBareKey(statusKey);
      if (isInvoices) {
        const invIdx = invoiceOpts.findIndex((o) => String(o.value).toLowerCase() === bare);
        const { tileColor, tileBgColor, tileTextColor, index } = invoiceStatusTileColorForValue(
          mergedSettings,
          bare,
          invIdx >= 0 ? invIdx : fallbackIndex
        );
        return resolveStatusTileProps(tileColor, index, { tileBgColor, tileTextColor, tileColor });
      }
      const quoteIdx = quoteOpts.findIndex((o) => String(o.value).toLowerCase() === bare);
      const { tileColor, tileBgColor, tileTextColor, index } = quoteStatusTileColorForValue(
        mergedSettings,
        bare,
        quoteIdx >= 0 ? quoteIdx : fallbackIndex
      );
      return resolveStatusTileProps(tileColor, index, { tileBgColor, tileTextColor, tileColor });
    };

    const sumMembers = (memberValues) => {
      let count = 0;
      let amount = 0;
      let taxCollected = 0;
      for (const m of memberValues || []) {
        const hit = bucketByStatus.get(statusBareKey(m));
        if (!hit) continue;
        count += hit.count;
        amount += hit.amount;
        taxCollected += hit.taxCollected;
      }
      return { count, amount, taxCollected };
    };

    /** @type {Array<{ key: string, label: string, count: number, amount: number, tileAppearance: ReturnType<typeof resolveStatusTileProps>, icon: typeof FiLayers }>} */
    let buttons;

    if (!isInvoices) {
      const specs = buildQuoteStatusFilterCardSpecs(mergedSettings);
      buttons = specs.map((spec, optIdx) => {
        const totals = sumMembers(spec.memberValues);
        const fallback = quoteStatusTileColorForValue(
          mergedSettings,
          spec.tileValue,
          spec.topIndex >= 0 ? spec.topIndex : optIdx
        );
        const tileBgColor = spec.filterGroupBgColor || fallback.tileBgColor || "";
        const tileTextColor = spec.filterGroupTextColor || fallback.tileTextColor || "";
        const tileColor = tileBgColor || tileTextColor ? "" : fallback.tileColor || "";
        return {
          key: spec.key,
          label: spec.label,
          count: totals.count,
          amount: totals.amount,
          tileAppearance: resolveStatusTileProps(tileColor, fallback.index, {
            tileBgColor,
            tileTextColor,
            tileColor,
          }),
          icon: statusCardIcon(spec.label),
        };
      });
    } else {
      buttons = statusOptionsForCards.map((opt, optIdx) => {
        const key = opt.value;
        const totals = sumMembers([statusBareKey(key)]);
        return {
          key,
          label: opt.label,
          count: totals.count,
          amount: totals.amount,
          tileAppearance: tileAppearanceForKey(key, optIdx),
          icon: statusCardIcon(opt.label),
        };
      });
    }

    const allCount = [...bucketByStatus.values()].reduce((s, b) => s + b.count, 0);
    const allAmount = [...bucketByStatus.values()].reduce((s, b) => s + b.amount, 0);
    const allTile = otherStatusTileColorForValue(mergedSettings, OTHER_STATUS_ALL, 0);
    buttons.unshift({
      key: "",
      label: allTile.label || "All",
      count: allCount,
      amount: allAmount,
      tileAppearance: resolveStatusTileProps(allTile.tileColor, allTile.index, {
        tileBgColor: allTile.tileBgColor,
        tileTextColor: allTile.tileTextColor,
        tileColor: allTile.tileColor,
      }),
      icon: statusCardIcon(allTile.label || "All"),
    });

    if (isInvoices) {
      const ar = invoiceFinance?.amountReceivable || { count: 0, amount: 0 };
      const taxPaid = invoiceFinance?.taxCollected || { count: 0, amount: 0 };
      const taxDue = invoiceFinance?.taxToCollect || { count: 0, amount: 0 };
      const arTile = otherStatusTileColorForValue(mergedSettings, FILTER_AMOUNT_RECEIVABLE, 3);
      const taxPaidTile = otherStatusTileColorForValue(mergedSettings, FILTER_TAX_COLLECTED, 2);
      const taxDueTile = otherStatusTileColorForValue(mergedSettings, FILTER_TAX_TO_COLLECT, 4);
      buttons.push(
        {
          key: FILTER_AMOUNT_RECEIVABLE,
          label: arTile.label || "Amount Receivable",
          count: ar.count,
          amount: ar.amount,
          tileAppearance: resolveStatusTileProps(arTile.tileColor, arTile.index, {
            tileBgColor: arTile.tileBgColor,
            tileTextColor: arTile.tileTextColor,
            tileColor: arTile.tileColor,
          }),
          icon: statusCardIcon(arTile.label || "Amount Receivable"),
        },
        {
          key: FILTER_TAX_COLLECTED,
          label: taxPaidTile.label || "Tax Collected",
          count: taxPaid.count,
          amount: taxPaid.amount,
          tileAppearance: resolveStatusTileProps(taxPaidTile.tileColor, taxPaidTile.index, {
            tileBgColor: taxPaidTile.tileBgColor,
            tileTextColor: taxPaidTile.tileTextColor,
            tileColor: taxPaidTile.tileColor,
          }),
          icon: statusCardIcon(taxPaidTile.label || "Tax Collected"),
        },
        {
          key: FILTER_TAX_TO_COLLECT,
          label: taxDueTile.label || "Tax To Be Collected",
          count: taxDue.count,
          amount: taxDue.amount,
          tileAppearance: resolveStatusTileProps(taxDueTile.tileColor, taxDueTile.index, {
            tileBgColor: taxDueTile.tileBgColor,
            tileTextColor: taxDueTile.tileTextColor,
            tileColor: taxDueTile.tileColor,
          }),
          icon: statusCardIcon(taxDueTile.label || "Tax To Be Collected"),
        }
      );
    }

    return buttons;
  }, [
    bucketByStatus,
    statusOptionsForCards,
    mergedSettings,
    quoteOpts,
    invoiceOpts,
    isInvoices,
    invoiceFinance,
  ]);

  const displayRows = rows;

  const currencySubtotals = useMemo(
    () => ({
      total: Number(listTotals.total) || 0,
      taxCollected: Number(listTotals.taxCollected) || 0,
    }),
    [listTotals]
  );

  const currencyHeader = useCallback((title, amount) => {
    return (
      <span className="inline-flex flex-col items-end gap-1 text-right">
        <span className="leading-none">{title}</span>
        <span
          className="inline-flex max-w-full items-center rounded bg-primary px-1.5 py-0.5 text-[11px] font-bold leading-none tabular-nums text-white shadow-sm"
          title={`${title} subtotal`}
        >
          {formatSimpleMoney(amount)}
        </span>
      </span>
    );
  }, []);

  const columns = useMemo(
    () => [
      {
        key: "quote",
        label: isInvoices ? "Invoice#" : "Quote/Job",
        sortable: true,
        render: (v, row) => (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => openEdit(row)}
          >
            {v || "-"}
          </button>
        ),
      },
      {
        key: "date",
        label: "Date",
        sortable: true,
        align: "right",
        render: (v) => {
          const text = formatDate(v);
          return text && text !== "-" ? text : "-";
        },
      },
      {
        key: "companyName",
        label: "Company Name",
        sortable: true,
        render: (v, row) => {
          const customerId = String(row.customerId || "").trim();
          const name = String(v || "").trim() || customerName(customerId) || "-";
          if (!customerId || name === "-") return name;
          return (
            <button
              type="button"
              className="text-left font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
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
      ...(!isInvoices ? [{ key: "phone", label: "Phone", sortable: true }] : []),
      { key: "email", label: "Email", sortable: true },
      {
        key: "quotedBy",
        label: "Quoted By",
        sortable: true,
        render: (v, row) =>
          resolveEmployeeDisplayName(employees, v || row?.preparedBy) || "—",
      },
      { key: "quoteType", label: "Quote Type", sortable: true },
      {
        key: "total",
        label: currencyHeader("Total", currencySubtotals.total),
        sortable: true,
        align: "right",
        render: (v) => formatSimpleMoney(Number(v) || 0),
      },
      {
        key: "taxCollected",
        label: isInvoices
          ? "Tax"
          : currencyHeader("Tax", currencySubtotals.taxCollected),
        sortable: true,
        align: "right",
        render: (v) => formatSimpleMoney(Number(v) || 0),
      },
      {
        key: "submitDate",
        label: isInvoices ? "Proposal Submit Date" : "Submit date",
        sortable: true,
        align: "right",
        headerWrap: isInvoices,
        minWidth: isInvoices ? 88 : undefined,
        className: isInvoices ? "max-w-[6.5rem]" : undefined,
        getCellStyle: (_, row) =>
          proposalStatusCellChrome(row, mergedSettings, quoteOpts, invoiceOpts).style,
        getCellClassName: (_, row) =>
          proposalStatusCellChrome(row, mergedSettings, quoteOpts, invoiceOpts).className,
        render: (v) => {
          const text = formatDate(v);
          const shown = text && text !== "-" ? text : "";
          return (
            <span
              className={`block px-1.5 py-1 text-right tabular-nums ${shown ? "font-semibold" : "font-normal"}`}
            >
              {shown || "-"}
            </span>
          );
        },
      },
      {
        key: "acceptDate",
        label: isInvoices ? "Proposal Accept Date" : "Accept Date",
        sortable: true,
        align: "right",
        headerWrap: isInvoices,
        minWidth: isInvoices ? 88 : undefined,
        className: isInvoices ? "max-w-[6.5rem]" : undefined,
        getCellStyle: (_, row) =>
          proposalStatusCellChrome(row, mergedSettings, quoteOpts, invoiceOpts).style,
        getCellClassName: (_, row) =>
          proposalStatusCellChrome(row, mergedSettings, quoteOpts, invoiceOpts).className,
        render: (v) => {
          const text = formatDate(v);
          const shown = text && text !== "-" ? text : "";
          return (
            <span
              className={`block px-1.5 py-1 text-right tabular-nums ${shown ? "font-semibold" : "font-normal"}`}
            >
              {shown || "-"}
            </span>
          );
        },
      },
      ...(isInvoices
        ? [
            {
              key: "invoiceSubmitDate",
              label: "Invoice Sent Date",
              sortable: true,
              align: "right",
              headerWrap: true,
              minWidth: 88,
              className: "max-w-[6.5rem]",
              getCellStyle: (_, row) =>
                proposalStatusCellChrome(row, mergedSettings, quoteOpts, invoiceOpts).style,
              getCellClassName: (_, row) =>
                proposalStatusCellChrome(row, mergedSettings, quoteOpts, invoiceOpts).className,
              render: (v) => {
                const text = formatDate(v);
                const shown = text && text !== "-" ? text : "";
                return (
                  <span
                    className={`block px-1.5 py-1 text-right tabular-nums ${shown ? "font-semibold" : "font-normal"}`}
                  >
                    {shown || "-"}
                  </span>
                );
              },
            },
            {
              key: "invoicePaidDate",
              label: "Invoice Paid Date",
              sortable: true,
              align: "right",
              headerWrap: true,
              minWidth: 88,
              className: "max-w-[6.5rem]",
              getCellStyle: (_, row) =>
                proposalStatusCellChrome(row, mergedSettings, quoteOpts, invoiceOpts).style,
              getCellClassName: (_, row) =>
                proposalStatusCellChrome(row, mergedSettings, quoteOpts, invoiceOpts).className,
              render: (v) => {
                const text = formatDate(v);
                const shown = text && text !== "-" ? text : "";
                return (
                  <span
                    className={`block px-1.5 py-1 text-right tabular-nums ${shown ? "font-semibold" : "font-normal"}`}
                  >
                    {shown || "-"}
                  </span>
                );
              },
            },
          ]
        : []),
      {
        key: "status",
        label: isInvoices ? "Invoice Status" : "Proposal Status",
        sortable: true,
        className: "min-w-[10rem]",
        getCellStyle: (_, row) =>
          proposalStatusCellChrome(row, mergedSettings, quoteOpts, invoiceOpts).style,
        getCellClassName: (_, row) =>
          proposalStatusCellChrome(row, mergedSettings, quoteOpts, invoiceOpts).className,
        render: (v, row) => {
          return (
            <div className="min-w-[8rem] max-w-[14rem]" onClick={(e) => e.stopPropagation()}>
              <SimpleSelect
                variant="pill"
                className="w-full"
                options={statusOptions}
                value={
                  isInvoices
                    ? toInvoiceStatusSelectValue(row.status, quoteStatusValues)
                    : row.status || ""
                }
                onChange={(e) => handleRowStatusChange(row, e.target.value)}
                triggerClassName="w-full rounded-none border-0 bg-transparent shadow-none ring-0"
                placeholder="Select…"
                searchable
                aria-label="Status"
              />
            </div>
          );
        },
      },
      {
        key: "jobStatus",
        label: "Status",
        sortable: true,
        className: "min-w-[9rem]",
        getCellStyle: (_, row) =>
          jobStatusCellChrome(row, jobStatusOptions, mergedSettings.workOrderStatusTileColors)
            .style,
        getCellClassName: (_, row) =>
          jobStatusCellChrome(row, jobStatusOptions, mergedSettings.workOrderStatusTileColors)
            .className,
        render: (v, row) => {
          const current = String(v || "").trim();
          return (
            <div className="min-w-[7rem] max-w-[12rem]" onClick={(e) => e.stopPropagation()}>
              <SimpleSelect
                variant="pill"
                className="w-full"
                options={jobStatusOptions}
                value={current}
                onChange={(e) => handleRowJobStatusChange(row, e.target.value)}
                triggerClassName="w-full rounded-none border-0 bg-transparent shadow-none ring-0"
                placeholder="Select…"
                searchable
                aria-label="Status"
              />
            </div>
          );
        },
      },
      {
        key: "notes",
        label: "Notes",
        sortable: false,
        className: "min-w-[12rem] max-w-[20rem]",
        render: (v, row) => {
          const text = String(v || "").trim();
          return (
            <button
              type="button"
              className="block w-full min-w-[12rem] max-w-[20rem] truncate text-left font-normal text-secondary hover:text-foreground"
              title={text || "Click to add notes"}
              onClick={(e) => {
                e.stopPropagation();
                openNotesEdit(row);
              }}
            >
              {text || "-"}
            </button>
          );
        },
      },
      {
        key: "actions",
        label: "",
        sortable: false,
        className: "w-12",
        render: (_, row) => (
          <button
            type="button"
            className="rounded p-0.5 text-danger hover:bg-danger/10"
            title="Delete"
            aria-label="Delete"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(row);
            }}
          >
            <FiX className="h-3.5 w-3.5" aria-hidden />
          </button>
        ),
      },
    ],
    [
      handleDelete,
      handleRowStatusChange,
      handleRowJobStatusChange,
      openNotesEdit,
      customerName,
      employees,
      mergedSettings,
      quoteOpts,
      invoiceOpts,
      statusOptions,
      jobStatusOptions,
      currencyHeader,
      currencySubtotals.total,
      currencySubtotals.taxCollected,
      isInvoices,
      quoteStatusValues,
      formatDate,
    ]
  );

  const renderStatusCard = (card) => (
    <StatusFilterPillButton
      key={card.key || "__all__"}
      card={card}
      active={(statusFilter || "") === (card.key || "")}
      onClick={() => {
        setPage(1);
        setStatusFilter(card.key || "");
      }}
      formatAmount={(n) =>
        `$${(Number.isFinite(n) ? n : 0).toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`
      }
    />
  );

  return (
    <div className={SIMPLE_SCREEN_PANEL_CLASS}>
      <div className={`${SIMPLE_SCREEN_FILTERS_CLASS} shrink-0`}>
        {statusSummaryCards.map(renderStatusCard)}
      </div>

      <div className={SIMPLE_SCREEN_TABLE_WRAP_CLASS}>
        <Table
          columns={columns}
          data={displayRows}
          rowKey="id"
          loading={!ready}
          searchable
          onSearch={(q) => {
            setPage(1);
            setSearchQuery(q);
          }}
          searchPlaceholder={isInvoices ? "Search invoices…" : "Search proposals…"}
          sortState={tableSort}
          onSort={(key, direction) => {
            setPage(1);
            setTableSort({ key, direction });
          }}
          onRefresh={reload}
          toolbarBeforeSearch={
            isInvoices ? null : (
              <Button type="button" variant="primary" size="sm" className="h-9 !rounded-none px-2.5" onClick={openCreate}>
                <FiPlus className="h-4 w-4 shrink-0" aria-hidden />
                Add New
              </Button>
            )
          }
          emptyMessage={
            totalCount === 0
              ? searchQuery.trim()
                ? "No records match your search."
                : statusFilter === FILTER_TAX_COLLECTED
                  ? "No fully paid invoices with tax collected."
                  : statusFilter === FILTER_TAX_TO_COLLECT
                    ? "No open invoices with tax still to collect."
                    : statusFilter === FILTER_AMOUNT_RECEIVABLE
                      ? "No open invoices with an amount receivable."
                      : statusFilter
                        ? "No records with this status."
                        : dateFrom || dateTo
                          ? isInvoices
                            ? "No invoices in this date range."
                            : "No service proposals in this date range."
                          : isInvoices
                            ? "No invoices yet. Convert a proposal to an invoice status to see it here."
                            : "No service proposals yet. Click Add New to create one."
              : isInvoices
                ? "No invoices yet."
                : "No service proposals yet. Click Add New to create one."
          }
          fillHeight
          responsive
          dense
          textSize="xs"
          stickyColumns
          paginateClientSide={false}
          pagination={{ page, pageSize, totalCount }}
          onPageChange={(nextPage, nextPageSize) => {
            setPage(nextPage);
            setPageSize(nextPageSize);
          }}
        />
      </div>

      <ServiceProposalFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingId(null);
        }}
        initialForm={editingRow}
        onSave={handleSave}
        onAttachmentsChange={handleAttachmentsChange}
      />

      <Modal
        open={!!notesEdit}
        onClose={closeNotesEdit}
        title={notesEdit?.quote ? `Notes — ${notesEdit.quote}` : "Notes"}
        size="md"
        actions={
          <Button type="submit" form={NOTES_EDIT_FORM_ID} variant="primary" size="sm">
            Save
          </Button>
        }
      >
        <form id={NOTES_EDIT_FORM_ID} onSubmit={handleNotesSave} className="flex flex-col gap-3">
          <Textarea
            id="simple-proposal-notes-edit"
            label="Notes"
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            rows={8}
            placeholder="Enter notes…"
            textareaClassName="min-h-[10rem]"
          />
        </form>
      </Modal>

      <CustomerViewModal
        open={!!openCustomerId}
        customerId={openCustomerId}
        onClose={() => setOpenCustomerId(null)}
        zIndex={120}
        portal="simple"
        onCustomerUpdated={(customer) => {
          const cid = String(customer?.id || openCustomerId || "").trim();
          if (!cid) return;
          const nextName =
            String(customer?.companyName || "").trim() ||
            String(customer?.primaryContactName || "").trim();
          const nextPhone = String(customer?.phone || "").trim();
          const nextEmail = String(customer?.email || "").trim();
          setCustomers((prev) => {
            const idx = prev.findIndex((c) => String(c.id || "") === cid);
            if (idx < 0) return [...prev, { ...customer, id: cid }];
            const next = [...prev];
            next[idx] = { ...next[idx], ...customer, id: cid };
            return next;
          });
          if (!nextName && !nextPhone && !nextEmail) return;
          setRows((prev) =>
            prev.map((r) => {
              if (String(r.customerId || "") !== cid) return r;
              return {
                ...r,
                ...(nextName ? { companyName: nextName } : {}),
                ...(nextPhone ? { phone: nextPhone } : {}),
                ...(nextEmail ? { email: nextEmail } : {}),
              };
            })
          );
        }}
      />
    </div>
  );
}
