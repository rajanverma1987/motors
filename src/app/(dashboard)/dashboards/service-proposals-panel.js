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
import { useUserSettings } from "@/contexts/user-settings-context";
import {
  invoiceStatusSelectOptionsFromMerged,
  invoiceStatusTileColorForValue,
  quoteStatusSelectOptionsFromMerged,
  quoteStatusTileColorForValue,
  buildCombinedQuoteInvoiceStatusOptions,
  buildQuoteStatusFilterCardSpecs,
  quoteStatusMatchesFilter,
  quoteStatusSortOrderForValue,
  workOrderStatusSelectOptionsFromMerged,
} from "@/lib/dropdown-catalog";
import { resolveStatusTileProps, resolveWorkOrderStatusTileProps } from "@/lib/work-order-status-tiles";
import { mergeUserSettings } from "@/lib/user-settings";
import { formatDateMdy } from "@/lib/format-date";
import { fetchAllPaginatedDashboardItems } from "@/lib/fetch-all-paginated-dashboard-items";
import { buildEmployeeSelectOptions } from "@/lib/technician-select-options";
import { parseAllJobsDateRange, recordInAllJobsDateRange } from "@/lib/all-jobs-date-filter";
import { sortRowsClient } from "@/lib/client-table-sort";
import {
  formatSimpleMoney,
  formToServiceProposalListRow,
  isSimpleInvoiceRecord,
  RECORD_TYPE_INVOICE,
  RECORD_TYPE_JOB,
  RECORD_TYPE_RFQ,
  resolveRecordTypeOnSave,
} from "@/lib/simple-service-proposal-form";
import {
  deleteSimpleServiceProposal,
  fetchSimpleServiceProposals,
  saveSimpleServiceProposal,
} from "@/lib/simple-portal-api";
import { computeNextJobNumber } from "@/lib/job-document-number-format";

export const SIMPLE_LIST_VARIANT_PROPOSALS = "proposals";
export const SIMPLE_LIST_VARIANT_INVOICES = "invoices";

const FILTER_TAX_COLLECTED = "__tax_collected__";
const FILTER_TAX_TO_COLLECT = "__tax_to_collect__";
const FILTER_AMOUNT_RECEIVABLE = "__amount_receivable__";

function statusBareKey(status) {
  return String(status || "")
    .trim()
    .toLowerCase()
    .replace(/^invoice:/, "");
}

/** True when invoice status is Fully Paid (settings slug or labeled). */
function isFullyPaidInvoiceStatus(status) {
  const bare = statusBareKey(status).replace(/[\s-]+/g, "_");
  return bare === "fully_paid" || bare.endsWith("_fully_paid");
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
  if (String(row?.recordType || "").toUpperCase() !== RECORD_TYPE_JOB) {
    return { style: null, className: "!p-0" };
  }
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
  const mergedSettings = useMemo(() => mergeUserSettings(settings), [settings]);
  const { from: dateFrom, to: dateTo } = parseAllJobsDateRange(searchParams);

  const [rows, setRows] = useState([]);
  const [ready, setReady] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [openCustomerId, setOpenCustomerId] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [tableSort, setTableSort] = useState({ key: null, direction: "asc" });
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
      const [list, cust, emps] = await Promise.all([
        fetchSimpleServiceProposals(),
        fetchAllPaginatedDashboardItems("/api/dashboard/customers"),
        fetchAllPaginatedDashboardItems("/api/dashboard/employees"),
      ]);
      setRows(Array.isArray(list) ? list : []);
      setCustomers(Array.isArray(cust) ? cust : []);
      setEmployees(Array.isArray(emps) ? emps : []);
    } catch {
      setRows([]);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const employeeLabel = useCallback(
    (id) => buildEmployeeSelectOptions(employees, id).find((o) => o.value === id)?.label || id || "",
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
    (openId) => {
      const row = rows.find((r) => String(r.id) === openId);
      if (!row) return true;
      const rowIsInvoice = isSimpleInvoiceRecord(row, invoiceStatusValues, quoteStatusValues);
      if (isInvoices !== rowIsInvoice) return true;
      openEdit(row);
      return true;
    },
    [rows, isInvoices, invoiceStatusValues, quoteStatusValues]
  );

  useSimpleOpenParam({
    ready,
    onOpen: handleDeepLinkOpen,
  });

  const handleSave = async (form, options = {}) => {
    const forceNew = options?.forceNew === true;
    const id = forceNew ? undefined : editingId || form.id || undefined;
    let documentNumber = forceNew ? "" : String(form.documentNumber ?? "").trim();
    if (!documentNumber) {
      // Simple portal sequence only — do not pull Classic Quotes counters (e.g. A00127).
      const localNumbers = rows
        .filter((r) => r.id !== id)
        .map((r) => r.documentNumber || r.quote)
        .filter(Boolean);
      documentNumber = computeNextJobNumber(localNumbers, mergedSettings);
    }
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

  const scopedRows = useMemo(
    () =>
      rows.filter((row) => {
        const isInv = isSimpleInvoiceRecord(row, invoiceStatusValues, quoteStatusValues);
        return isInvoices ? isInv : !isInv;
      }),
    [rows, isInvoices, invoiceStatusValues, quoteStatusValues]
  );

  const rowsForDate = useMemo(
    () =>
      scopedRows.filter((row) =>
        recordInAllJobsDateRange(
          { date: row.date || row.dateCreated || "" },
          dateFrom,
          dateTo
        )
      ),
    [scopedRows, dateFrom, dateTo]
  );

  const statusMatchesFilter = useCallback(
    (rowStatus, filterKey) => {
      if (!isInvoices) {
        return quoteStatusMatchesFilter(rowStatus, filterKey, mergedSettings);
      }
      const s = String(rowStatus || "")
        .trim()
        .toLowerCase();
      const f = String(filterKey || "")
        .trim()
        .toLowerCase();
      if (!f) return true;
      if (s === f) return true;
      const sBare = s.replace(/^invoice:/, "");
      const fBare = f.replace(/^invoice:/, "");
      if (f.startsWith("invoice:") || s.startsWith("invoice:")) {
        return sBare === fBare;
      }
      return false;
    },
    [isInvoices, mergedSettings]
  );

  const statusSummaryCards = useMemo(() => {
    const pool = rowsForDate;
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

    /** @type {Array<{ key: string, label: string, count: number, amount: number, tileAppearance: ReturnType<typeof resolveStatusTileProps>, icon: typeof FiLayers }>} */
    let buttons;

    if (!isInvoices) {
      const specs = buildQuoteStatusFilterCardSpecs(mergedSettings);
      buttons = specs.map((spec, optIdx) => {
        const matched = pool.filter((r) => statusMatchesFilter(r.status, spec.key));
        const fallback = quoteStatusTileColorForValue(
          mergedSettings,
          spec.tileValue,
          spec.topIndex >= 0 ? spec.topIndex : optIdx
        );
        const tileBgColor = spec.filterGroupBgColor || fallback.tileBgColor || "";
        const tileTextColor = spec.filterGroupTextColor || fallback.tileTextColor || "";
        const tileColor =
          tileBgColor || tileTextColor ? "" : fallback.tileColor || "";
        return {
          key: spec.key,
          label: spec.label,
          count: matched.length,
          amount: matched.reduce((sum, r) => sum + (Number(r.total) || 0), 0),
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
        const matched = pool.filter((r) => statusMatchesFilter(r.status, key));
        return {
          key,
          label: opt.label,
          count: matched.length,
          amount: matched.reduce((sum, r) => sum + (Number(r.total) || 0), 0),
          tileAppearance: tileAppearanceForKey(key, optIdx),
          icon: statusCardIcon(opt.label),
        };
      });
    }

    buttons.unshift({
      key: "",
      label: "All",
      count: pool.length,
      amount: pool.reduce((sum, r) => sum + (Number(r.total) || 0), 0),
      tileAppearance: tileAppearanceForKey("", 0),
      icon: statusCardIcon("All"),
    });

    if (isInvoices) {
      const paid = pool.filter((r) => isFullyPaidInvoiceStatus(r.status));
      const unpaid = pool.filter((r) => !isFullyPaidInvoiceStatus(r.status));
      buttons.push(
        {
          key: FILTER_AMOUNT_RECEIVABLE,
          label: "Amount Receivable",
          count: unpaid.length,
          amount: unpaid.reduce((sum, r) => sum + (Number(r.total) || 0), 0),
          tileAppearance: resolveStatusTileProps("", 3),
          icon: statusCardIcon("Amount Receivable"),
        },
        {
          key: FILTER_TAX_COLLECTED,
          label: "Tax Collected",
          count: paid.length,
          amount: paid.reduce((sum, r) => sum + (Number(r.taxCollected) || 0), 0),
          tileAppearance: resolveStatusTileProps("", 2),
          icon: statusCardIcon("Tax Collected"),
        },
        {
          key: FILTER_TAX_TO_COLLECT,
          label: "Tax to be collected",
          count: unpaid.length,
          amount: unpaid.reduce((sum, r) => sum + (Number(r.taxCollected) || 0), 0),
          tileAppearance: resolveStatusTileProps("", 4),
          icon: statusCardIcon("Tax to be collected"),
        }
      );
    }

    return buttons;
  }, [
    rowsForDate,
    statusOptionsForCards,
    mergedSettings,
    quoteOpts,
    invoiceOpts,
    isInvoices,
    statusMatchesFilter,
  ]);

  const statusFilteredRows = useMemo(() => {
    if (!statusFilter) return rowsForDate;
    if (statusFilter === FILTER_AMOUNT_RECEIVABLE) {
      return rowsForDate.filter((r) => !isFullyPaidInvoiceStatus(r.status));
    }
    if (statusFilter === FILTER_TAX_COLLECTED) {
      return rowsForDate.filter((r) => isFullyPaidInvoiceStatus(r.status));
    }
    if (statusFilter === FILTER_TAX_TO_COLLECT) {
      return rowsForDate.filter((r) => !isFullyPaidInvoiceStatus(r.status));
    }
    return rowsForDate.filter((r) => statusMatchesFilter(r.status, statusFilter));
  }, [rowsForDate, statusFilter, statusMatchesFilter]);

  const getProposalSortValue = useCallback(
    (row, key) => {
      if (key === "status" && !isInvoices) {
        return quoteStatusSortOrderForValue(mergedSettings, row?.status);
      }
      return row?.[key];
    },
    [isInvoices, mergedSettings]
  );

  const displayRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = !q
      ? statusFilteredRows
      : statusFilteredRows.filter((row) => {
          const haystack = [
            row.quote,
            row.documentNumber,
            row.companyName,
            row.phone,
            row.email,
            row.quotedBy,
            row.quoteType,
            row.notes,
            row.status,
            row.jobStatus,
            row.date,
            row.dateCreated,
            row.dueDate,
            row.submitDate,
            row.acceptDate,
            row.total != null ? String(row.total) : "",
            row.taxCollected != null ? String(row.taxCollected) : "",
            formatSimpleMoney(Number(row.total) || 0),
            formatSimpleMoney(Number(row.taxCollected) || 0),
          ]
            .map((v) => String(v ?? "").toLowerCase())
            .join(" ");
          return haystack.includes(q);
        });
    return sortRowsClient(filtered, tableSort, getProposalSortValue);
  }, [statusFilteredRows, searchQuery, tableSort, getProposalSortValue]);

  const currencySubtotals = useMemo(() => {
    let total = 0;
    let taxCollected = 0;
    for (const row of displayRows) {
      total += Number(row.total) || 0;
      taxCollected += Number(row.taxCollected) || 0;
    }
    return { total, taxCollected };
  }, [displayRows]);

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
        render: (v) => formatDateMdy(v) || "-",
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
      { key: "phone", label: "Phone", sortable: true },
      { key: "email", label: "Email", sortable: true },
      { key: "quotedBy", label: "Quoted By", sortable: true },
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
        label: "Submit date",
        sortable: true,
        getCellStyle: (_, row) =>
          proposalStatusCellChrome(row, mergedSettings, quoteOpts, invoiceOpts).style,
        getCellClassName: (_, row) =>
          proposalStatusCellChrome(row, mergedSettings, quoteOpts, invoiceOpts).className,
        render: (v) => {
          const text = formatDateMdy(v);
          return (
            <span
              className={`block px-1.5 py-1 tabular-nums ${text ? "font-semibold" : "font-normal"}`}
            >
              {text || "-"}
            </span>
          );
        },
      },
      {
        key: "acceptDate",
        label: "Accept Date",
        sortable: true,
        getCellStyle: (_, row) =>
          proposalStatusCellChrome(row, mergedSettings, quoteOpts, invoiceOpts).style,
        getCellClassName: (_, row) =>
          proposalStatusCellChrome(row, mergedSettings, quoteOpts, invoiceOpts).className,
        render: (v) => {
          const text = formatDateMdy(v);
          return (
            <span
              className={`block px-1.5 py-1 tabular-nums ${text ? "font-semibold" : "font-normal"}`}
            >
              {text || "-"}
            </span>
          );
        },
      },
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
                value={row.status || ""}
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
        label: "Job Status",
        sortable: true,
        className: "min-w-[9rem]",
        getCellStyle: (_, row) =>
          jobStatusCellChrome(
            row,
            jobStatusOptions,
            mergedSettings.workOrderStatusTileColors
          ).style,
        getCellClassName: (_, row) =>
          jobStatusCellChrome(
            row,
            jobStatusOptions,
            mergedSettings.workOrderStatusTileColors
          ).className,
        render: (v, row) => {
          if (String(row.recordType || "").toUpperCase() !== RECORD_TYPE_JOB) {
            return "";
          }
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
                aria-label="Job Status"
              />
            </div>
          );
        },
      },
      {
        key: "notes",
        label: "Notes",
        sortable: false,
        className: "min-w-[18rem]",
        render: (v) => (
          <span className="block min-w-[18rem] max-w-[28rem] whitespace-normal break-words font-normal text-secondary" title={v || ""}>
            {v || "-"}
          </span>
        ),
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
      customerName,
      mergedSettings,
      quoteOpts,
      invoiceOpts,
      statusOptions,
      jobStatusOptions,
      currencyHeader,
      currencySubtotals.total,
      currencySubtotals.taxCollected,
      isInvoices,
    ]
  );

  const invoiceSummaryKeys = useMemo(
    () =>
      new Set([FILTER_AMOUNT_RECEIVABLE, FILTER_TAX_COLLECTED, FILTER_TAX_TO_COLLECT]),
    []
  );
  const mainStatusCards = useMemo(
    () => statusSummaryCards.filter((c) => !invoiceSummaryKeys.has(c.key)),
    [statusSummaryCards, invoiceSummaryKeys]
  );
  const invoiceSummaryCards = useMemo(
    () => statusSummaryCards.filter((c) => invoiceSummaryKeys.has(c.key)),
    [statusSummaryCards, invoiceSummaryKeys]
  );

  const renderStatusCard = (card) => (
    <StatusFilterPillButton
      key={card.key || "__all__"}
      card={card}
      active={(statusFilter || "") === (card.key || "")}
      onClick={() => setStatusFilter(card.key || "")}
      formatAmount={(n) =>
        `$${(Number.isFinite(n) ? n : 0).toLocaleString("en-US", {
          maximumFractionDigits: 0,
        })}`
      }
    />
  );

  return (
    <div className={SIMPLE_SCREEN_PANEL_CLASS}>
      <div className={`${SIMPLE_SCREEN_FILTERS_CLASS} shrink-0 items-start justify-between`}>
        <div className="flex min-w-0 flex-wrap gap-2">{mainStatusCards.map(renderStatusCard)}</div>
        {invoiceSummaryCards.length > 0 ? (
          <div className="ml-auto flex min-w-0 flex-wrap justify-end gap-2">
            {invoiceSummaryCards.map(renderStatusCard)}
          </div>
        ) : null}
      </div>

      <div className={SIMPLE_SCREEN_TABLE_WRAP_CLASS}>
        <Table
          columns={columns}
          data={displayRows}
          rowKey="id"
          loading={!ready}
          searchable
          onSearch={setSearchQuery}
          searchPlaceholder={isInvoices ? "Search invoices…" : "Search proposals…"}
          sortState={tableSort}
          onSort={(key, direction) => setTableSort({ key, direction })}
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
            scopedRows.length === 0
              ? isInvoices
                ? "No invoices yet. Convert a proposal to an invoice status to see it here."
                : "No service proposals yet. Click Add New to create one."
              : (dateFrom || dateTo) && rowsForDate.length === 0
                ? isInvoices
                  ? "No invoices in this date range."
                  : "No service proposals in this date range."
                : statusFilter && statusFilteredRows.length === 0
                  ? "No records with this status."
                  : searchQuery.trim()
                    ? "No records match your search."
                    : isInvoices
                      ? "No invoices yet."
                      : "No service proposals yet. Click Add New to create one."
          }
          fillHeight
          responsive
          dense
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
