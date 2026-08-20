"use client";

import { useCallback, useMemo, useState } from "react";
import { FiSearch } from "react-icons/fi";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Table from "@/components/ui/table";
import Tabs from "@/components/ui/tabs";
import DatasheetFieldGrid from "@/components/simple/simple-datasheet-field-grid";
import ServiceProposalFormModal from "@/components/simple/service-proposal-form-modal";
import CustomerViewModal from "@/components/dashboard/customer-view-modal";
import { useAlert } from "@/components/confirm-provider";
import {
  MASTER_DATA_SEARCH_FORMS,
  createEmptyDatasheetCriteria,
} from "@/lib/simple-datasheet-form";
import { formToServiceProposalListRow } from "@/lib/simple-service-proposal-form";
import { saveSimpleServiceProposal } from "@/lib/simple-portal-api";
import {
  SIMPLE_SCREEN_PANEL_CLASS,
  SIMPLE_SCREEN_TABLE_WRAP_CLASS,
} from "@/lib/simple-screen-ui";

function emptyCriteriaForForm(formId) {
  const form = MASTER_DATA_SEARCH_FORMS[formId];
  if (form?.searchType === "customer") {
    return { companyName: "", primaryContactName: "" };
  }
  /** @type {Record<string, Record<string, string>>} */
  const out = {};
  if (!form) return out;
  for (const block of form.blocks) {
    out[block.id] = createEmptyDatasheetCriteria(block.columns);
  }
  return out;
}

/**
 * Hub — Master Data Search (datasheet field wildcard search across jobs).
 */
export default function MasterDataSearchPanel() {
  const alert = useAlert();
  const [formId, setFormId] = useState("ac");
  const [criteriaByForm, setCriteriaByForm] = useState(() => ({
    ac: emptyCriteriaForForm("ac"),
    dc: emptyCriteriaForForm("dc"),
    armature: emptyCriteriaForForm("armature"),
    customer: emptyCriteriaForForm("customer"),
  }));
  const [searching, setSearching] = useState(false);
  const [resultMeta, setResultMeta] = useState(null);
  const [rows, setRows] = useState([]);
  const [openProposalId, setOpenProposalId] = useState(null);
  const [openCustomerId, setOpenCustomerId] = useState(null);
  /** After a Search click, highlight filled criteria inputs until Clear. */
  const [highlightFilledFields, setHighlightFilledFields] = useState(false);

  const patchField = useCallback((activeFormId, blockId, key, value) => {
    setCriteriaByForm((prev) => ({
      ...prev,
      [activeFormId]: {
        ...(prev[activeFormId] || {}),
        [blockId]: {
          ...((prev[activeFormId] || {})[blockId] || {}),
          [key]: value,
        },
      },
    }));
  }, []);

  const patchCustomerField = useCallback((key, value) => {
    setCriteriaByForm((prev) => ({
      ...prev,
      customer: {
        ...(prev.customer || {}),
        [key]: value,
      },
    }));
  }, []);

  const clearForm = useCallback(() => {
    setCriteriaByForm((prev) => ({
      ...prev,
      [formId]: emptyCriteriaForForm(formId),
    }));
    setRows([]);
    setResultMeta(null);
    setHighlightFilledFields(false);
  }, [formId]);

  const runSearch = useCallback(async () => {
    if (searching) return;
    setSearching(true);
    setHighlightFilledFields(true);
    try {
      const res = await fetch("/api/dashboard/simple-master-data-search", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId,
          criteria:
            MASTER_DATA_SEARCH_FORMS[formId]?.searchType === "customer"
              ? criteriaByForm.customer || {}
              : criteriaByForm[formId] || {},
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Search failed");
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setResultMeta({
        searchedFields: Array.isArray(data.searchedFields) ? data.searchedFields : [],
        truncated: Boolean(data.truncated),
        limit: Number(data.limit) || 200,
        searchType: String(data.searchType || "").trim(),
      });
    } catch (err) {
      setRows([]);
      setResultMeta(null);
      await alert({
        title: "Search failed",
        message: err.message || "Search failed",
        variant: "danger",
      });
    } finally {
      setSearching(false);
    }
  }, [alert, criteriaByForm, formId, searching]);

  const openProposal = useCallback((row) => {
    const id = String(row?.id || "").trim();
    if (!id) return;
    setOpenProposalId(id);
  }, []);

  const openCustomer = useCallback((row) => {
    const id = String(row?.customerId || "").trim();
    if (!id) return;
    setOpenCustomerId(id);
  }, []);

  const handleProposalSave = useCallback(async (form, options = {}) => {
    const forceNew = options?.forceNew === true;
    const id = forceNew ? undefined : openProposalId || form.id || undefined;
    const documentNumber = String(form.documentNumber ?? form.quote ?? "").trim();
    const existing = rows.find((r) => String(r.id) === String(id || ""));
    const row = formToServiceProposalListRow(
      { ...form, documentNumber, ...(forceNew ? { id: "", recordType: "RFQ" } : {}) },
      {
        id: id || "",
        companyName:
          String(form.companyName || "").trim() ||
          (forceNew ? "" : existing?.customer) ||
          "",
      }
    );
    const saved = await saveSimpleServiceProposal(
      { ...row, id: id || undefined },
      { forceNew: forceNew || !id }
    );
    const sid = String(saved?.id || id || "").trim();
    if (sid) {
      setRows((prev) =>
        prev.map((r) =>
          String(r.id) === sid
            ? {
                ...r,
                id: sid,
                jobNumber:
                  String(saved?.documentNumber || saved?.quote || r.jobNumber || "").trim() ||
                  r.jobNumber,
                customer:
                  String(saved?.companyName || r.customer || "").trim() || r.customer,
                customerId: String(saved?.customerId || r.customerId || "").trim(),
              }
            : r
        )
      );
      setOpenProposalId(sid);
    }
    return saved;
  }, [openProposalId, rows]);

  const columns = useMemo(() => {
    const searched = resultMeta?.searchedFields || [];
    const isCustomerSearch = resultMeta?.searchType === "customer";
    const base = [
      {
        key: "jobNumber",
        label: "Job #",
        sortable: true,
        className: "w-28",
        render: (v, row) => {
          const label = String(v || "").trim() || "—";
          const id = String(row?.id || "").trim();
          if (!id || label === "—") return label;
          return (
            <button
              type="button"
              className="font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
              onClick={() => openProposal(row)}
            >
              {label}
            </button>
          );
        },
      },
      {
        key: "customer",
        label: "Customer",
        sortable: true,
        render: (v, row) => {
          const name = String(v || "").trim() || "—";
          const customerId = String(row?.customerId || "").trim();
          if (!customerId || name === "—") return name;
          return (
            <button
              type="button"
              className="text-left font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 rounded"
              onClick={(e) => {
                e.stopPropagation();
                openCustomer(row);
              }}
            >
              {name}
            </button>
          );
        },
      },
    ];
    if (isCustomerSearch) {
      base.push({
        key: "contactName",
        label: "Contact Name",
        sortable: true,
        render: (v) => String(v || "").trim() || "—",
      });
      return base;
    }
    const fieldCols = searched.map((f) => ({
      key: `field:${f.key}`,
      label: f.label,
      sortable: false,
      render: (_, row) => {
        const val = row?.fields?.[f.key];
        return val == null || val === "" ? "—" : String(val);
      },
    }));
    return [...base, ...fieldCols];
  }, [openCustomer, openProposal, resultMeta]);

  const formTabs = useMemo(
    () =>
      Object.values(MASTER_DATA_SEARCH_FORMS).map((f) => ({
        id: f.id,
        label: f.label,
        children:
          f.searchType === "customer" ? (
            <div className="flex min-w-0 max-w-md flex-col gap-4 pt-3">
              <Input
                label="Customer Name"
                value={criteriaByForm.customer?.companyName ?? ""}
                onChange={(e) => patchCustomerField("companyName", e.target.value)}
                placeholder="e.g. *Acme* or exact name"
                inputClassName={
                  highlightFilledFields && String(criteriaByForm.customer?.companyName || "").trim()
                    ? "border-primary/50 bg-primary/[0.08] dark:bg-primary/15"
                    : ""
                }
              />
              <Input
                label="Contact Name"
                value={criteriaByForm.customer?.primaryContactName ?? ""}
                onChange={(e) => patchCustomerField("primaryContactName", e.target.value)}
                placeholder="e.g. *Smith* or exact name"
                inputClassName={
                  highlightFilledFields && String(criteriaByForm.customer?.primaryContactName || "").trim()
                    ? "border-primary/50 bg-primary/[0.08] dark:bg-primary/15"
                    : ""
                }
              />
              <p className="text-xs text-secondary">
                Use <span className="font-medium text-title">*</span> wildcards — e.g.{" "}
                <span className="font-mono text-title">*abb*</span> or{" "}
                <span className="font-mono text-title">Smith*</span>. Both fields are combined with AND.
              </p>
            </div>
          ) : (
            <div className="flex min-w-0 flex-col gap-4 pt-3">
              {(f.blocks || []).map((block) => (
                <div key={block.id} className="min-w-0">
                  {f.blocks.length > 1 ? (
                    <p className="mb-2 border-b border-primary/25 pb-1 text-sm font-bold uppercase tracking-wide text-primary">
                      {block.label}
                    </p>
                  ) : null}
                  <DatasheetFieldGrid
                    columns={block.columns}
                    values={criteriaByForm[f.id]?.[block.id] || {}}
                    onFieldChange={(key, value) => patchField(f.id, block.id, key, value)}
                    highlightFilled={highlightFilledFields && f.id === formId}
                    dense
                  />
                </div>
              ))}
            </div>
          ),
      })),
    [
      criteriaByForm,
      formId,
      highlightFilledFields,
      patchCustomerField,
      patchField,
    ]
  );

  const editingProposal = useMemo(
    () => (openProposalId ? { id: openProposalId } : null),
    [openProposalId]
  );

  return (
    <div className={`${SIMPLE_SCREEN_PANEL_CLASS} flex min-h-0 flex-1 flex-col gap-3 overflow-hidden`}>
      <div className="shrink-0 border-b border-border pb-3">
        <h2 className="text-lg font-semibold text-title">Master Data Search</h2>
        <p className="mt-1 text-sm text-secondary">
          Search jobs by datasheet fields (same fields as the Service Proposal DataSheet). Use{" "}
          <span className="font-medium text-title">*</span> wildcards — e.g.{" "}
          <span className="font-mono text-xs text-title">*abb*</span>,{" "}
          <span className="font-mono text-xs text-title">10*</span>, or exact{" "}
          <span className="font-mono text-xs text-title">text</span>. Multiple fields are combined with AND.
        </p>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden lg:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-sm border border-border bg-card">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-primary/[0.04] px-3 py-2">
            <span className="text-xs font-bold uppercase tracking-wide text-secondary">
              Search criteria
            </span>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={clearForm} disabled={searching}>
                Clear
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => void runSearch()}
                disabled={searching}
                className="inline-flex items-center gap-1.5"
              >
                <FiSearch className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {searching ? "Searching…" : "Search"}
              </Button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <Tabs
              tabs={formTabs}
              value={formId}
              onChange={setFormId}
              ariaLabel="Master data motor type"
              keepMounted
              animatePanel={false}
              listClassName="!rounded-none"
              tabButtonClassName="!rounded-none"
              panelClassName="pt-0"
            />
          </div>
        </div>

        <div className="flex min-h-0 min-w-0 flex-[1.15] flex-col overflow-hidden rounded-sm border border-border bg-card">
          <div className="shrink-0 border-b border-border bg-primary/[0.04] px-3 py-2">
            <p className="text-xs font-bold uppercase tracking-wide text-secondary">
              Results
              {resultMeta
                ? ` (${rows.length}${resultMeta.truncated ? ` of first ${resultMeta.limit}` : ""})`
                : ""}
            </p>
            {resultMeta?.truncated ? (
              <p className="mt-0.5 text-[11px] text-warning">
                Showing the first {resultMeta.limit} matches. Narrow your criteria for more specific results.
              </p>
            ) : null}
          </div>
          <div className={`${SIMPLE_SCREEN_TABLE_WRAP_CLASS} min-h-0 flex-1 overflow-auto p-2`}>
            {!resultMeta ? (
              <p className="px-2 py-6 text-center text-sm text-secondary">
                Enter criteria and click Search to find matching jobs.
              </p>
            ) : (
              <Table
                columns={columns}
                data={rows}
                rowKey="id"
                emptyMessage={
                  resultMeta?.searchType === "customer"
                    ? "No jobs matched these customer criteria."
                    : "No jobs matched these datasheet criteria."
                }
                responsive
                searchable={false}
                dense
                textSize="xs"
              />
            )}
          </div>
        </div>
      </div>

      <ServiceProposalFormModal
        open={Boolean(openProposalId)}
        onClose={() => setOpenProposalId(null)}
        initialForm={editingProposal}
        onSave={handleProposalSave}
      />

      <CustomerViewModal
        open={Boolean(openCustomerId)}
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
          if (!nextName) return;
          setRows((prev) =>
            prev.map((r) =>
              String(r.customerId || "") === cid ? { ...r, customer: nextName } : r
            )
          );
        }}
      />
    </div>
  );
}
