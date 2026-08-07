"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { FiCopy, FiLayers, FiPlus, FiUser, FiUserPlus } from "react-icons/fi";
import Table from "@/components/ui/table";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import { Form } from "@/components/ui/form-layout";
import Modal from "@/components/ui/modal";
import StatusFilterPillButton from "@/components/dashboard/status-filter-pill-button";
import SimpleCustomerFormFields from "@/components/simple/simple-customer-form-fields";
import CustomerViewModal from "@/components/dashboard/customer-view-modal";
import { useAlert } from "@/components/confirm-provider";
import {
  buildCustomerPayload,
  INITIAL_CUSTOMER_FORM,
  uploadCustomerDocumentFiles,
} from "@/lib/customer-record-form";
import { resolveStatusTileProps } from "@/lib/work-order-status-tiles";
import { useSimpleOpenParam } from "@/hooks/use-simple-open-param";
import { parseSimpleOpenParam } from "@/lib/simple-portal-open";
import {
  SIMPLE_SCREEN_FILTERS_CLASS,
  SIMPLE_SCREEN_PANEL_CLASS,
  SIMPLE_SCREEN_TABLE_WRAP_CLASS,
} from "@/lib/simple-screen-ui";

const CUSTOMER_FORM_ID = "simple-customers-panel-form";

const TYPE_CUSTOMER = "Customer";
const TYPE_LEAD = "Lead";
const FILTER_ALL = "";
const FILTER_CUSTOMERS = TYPE_CUSTOMER;
const FILTER_LEADS = TYPE_LEAD;

const LEAD_STATUS_LABEL = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  won: "Won",
  lost: "Lost",
};

const LEAD_STATUS_BADGE = {
  new: "primary",
  contacted: "warning",
  quoted: "primary",
  won: "success",
  lost: "danger",
};

function leadToTableRow(lead) {
  const id = String(lead?.id || "").trim();
  return {
    rowKey: `lead-${id}`,
    id,
    recordType: TYPE_LEAD,
    companyName: String(lead?.company || "").trim() || String(lead?.name || "").trim() || "—",
    primaryContactName: String(lead?.name || "").trim(),
    phone: String(lead?.phone || "").trim(),
    email: String(lead?.email || "").trim(),
    ein: "",
    creditLimit: "",
    taxExempt: true,
    taxPercent: "",
    city: String(lead?.city || "").trim(),
    state: "",
    leadStatus: String(lead?.status || "new").trim() || "new",
    leadSource: String(lead?.source || lead?.leadSource || "").trim(),
    leadRaw: lead,
  };
}

function customerToTableRow(customer) {
  const id = String(customer?.id || "").trim();
  return {
    ...customer,
    rowKey: `customer-${id}`,
    id,
    recordType: TYPE_CUSTOMER,
  };
}

export default function CustomersPanel({ createNonce = 0 }) {
  const alert = useAlert();
  const [customerRows, setCustomerRows] = useState([]);
  const [leadRows, setLeadRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState(FILTER_ALL);
  const [tableSort, setTableSort] = useState({ key: "companyName", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [customerTotalCount, setCustomerTotalCount] = useState(0);
  const [leadTotalCount, setLeadTotalCount] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(INITIAL_CUSTOMER_FORM);
  const [saving, setSaving] = useState(false);
  const [leadDetail, setLeadDetail] = useState(null);
  const [convertingFromLeadId, setConvertingFromLeadId] = useState(null);
  const [copyingPortalId, setCopyingPortalId] = useState("");
  const [viewCustomerId, setViewCustomerId] = useState(null);
  const lastHandledCreateNonceRef = useRef(createNonce);

  const showingLeads = typeFilter === FILTER_LEADS;

  const loadAll = useCallback(
    async ({ showError = true } = {}) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });
        if (searchQuery.trim()) params.set("q", searchQuery.trim());
        if (tableSort?.key) {
          params.set("sortBy", tableSort.key);
          params.set("sortDir", tableSort.direction || "asc");
        }
        const endpoint = showingLeads
          ? `/api/dashboard/leads?${params}`
          : `/api/dashboard/customers?${params}`;
        const countParams = new URLSearchParams({ page: "1", pageSize: "1" });
        const [listRes, custCountRes, leadCountRes] = await Promise.all([
          fetch(endpoint, { credentials: "include", cache: "no-store" }),
          fetch(`/api/dashboard/customers?${countParams}`, {
            credentials: "include",
            cache: "no-store",
          }),
          fetch(`/api/dashboard/leads?${countParams}`, {
            credentials: "include",
            cache: "no-store",
          }),
        ]);
        const listData = await listRes.json().catch(() => ({}));
        const custCountData = await custCountRes.json().catch(() => ({}));
        const leadCountData = await leadCountRes.json().catch(() => ({}));
        if (!listRes.ok) throw new Error(listData.error || "Failed to load");
        const items = Array.isArray(listData.items) ? listData.items : [];
        if (showingLeads) {
          setLeadRows(items.map(leadToTableRow).filter((r) => r.id));
          setCustomerRows([]);
        } else {
          setCustomerRows(items.map(customerToTableRow).filter((r) => r.id));
          setLeadRows([]);
        }
        setTotalCount(Number(listData.totalCount) || 0);
        setCustomerTotalCount(Number(custCountData.totalCount) || 0);
        setLeadTotalCount(Number(leadCountData.totalCount) || 0);
      } catch (err) {
        setCustomerRows([]);
        setLeadRows([]);
        setTotalCount(0);
        if (showError) {
          await alert({
            title: "Error",
            message: err.message || "Failed to load customers and leads",
            variant: "danger",
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [alert, page, pageSize, searchQuery, tableSort, showingLeads]
  );

  useEffect(() => {
    void loadAll({ showError: false });
  }, [loadAll]);

  const openCreate = useCallback(() => {
    setConvertingFromLeadId(null);
    setForm({ ...INITIAL_CUSTOMER_FORM });
    setModalOpen(true);
  }, []);

  useEffect(() => {
    if (!createNonce) return;
    if (createNonce === lastHandledCreateNonceRef.current) return;
    lastHandledCreateNonceRef.current = createNonce;
    openCreate();
  }, [createNonce, openCreate]);

  const openCustomerDetails = useCallback((rowOrId) => {
    const id =
      typeof rowOrId === "string" || typeof rowOrId === "number"
        ? String(rowOrId || "").trim()
        : String(rowOrId?.id || "").trim();
    if (!id) return;
    setViewCustomerId(id);
  }, []);

  const startConvertLeadToCustomer = useCallback(
    async (row) => {
      const leadId = String(row?.id || "").trim();
      if (!leadId) return;
      const leadEmail = String(row?.email || "").trim().toLowerCase();
      const leadCompany = String(row?.companyName || "").trim().toLowerCase();
      const existing = customerRows.find((c) => {
        const matchEmail = leadEmail && String(c.email || "").toLowerCase() === leadEmail;
        const matchCompany =
          leadCompany &&
          leadCompany !== "—" &&
          String(c.companyName || "").trim().toLowerCase() === leadCompany;
        return matchEmail || matchCompany;
      });
      if (existing) {
        setLeadDetail(null);
        await alert({
          title: "Customer already exists",
          message: `A customer matching this lead already exists (${existing.companyName || "customer"}). Opening that record.`,
        });
        openCustomerDetails(existing);
        return;
      }
      setLeadDetail(null);
      setConvertingFromLeadId(leadId);
      setForm({
        ...INITIAL_CUSTOMER_FORM,
        companyName: String(row?.companyName || "").trim() === "—" ? "" : String(row?.companyName || "").trim(),
        primaryContactName: String(row?.primaryContactName || "").trim(),
        phone: String(row?.phone || "").trim(),
        email: String(row?.email || "").trim(),
        city: String(row?.city || "").trim(),
        zipCode: String(row?.leadRaw?.zipCode || "").trim(),
        notes: String(row?.leadRaw?.message || row?.leadRaw?.problemDescription || "").trim(),
      });
      setModalOpen(true);
    },
    [alert, customerRows, openCustomerDetails]
  );

  const openRow = useCallback(
    (row) => {
      if (row?.recordType === TYPE_LEAD) {
        setLeadDetail(row);
        return;
      }
      openCustomerDetails(row);
    },
    [openCustomerDetails]
  );

  const handleCopyPortalLink = useCallback(
    async (customerId) => {
      const id = String(customerId || "").trim();
      if (!id || copyingPortalId) return;
      setCopyingPortalId(id);
      try {
        const res = await fetch(
          `/api/dashboard/customer-portal/link?customerId=${encodeURIComponent(id)}`,
          { credentials: "include", cache: "no-store" }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to get link");
        const url = String(data.url || "").trim();
        if (!url) throw new Error("Portal link was empty");
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
          await alert({
            title: "Copied",
            message: "Customer portal link copied to clipboard.",
          });
        } else {
          window.prompt("Copy this customer portal link:", url);
        }
      } catch (err) {
        await alert({
          title: "Error",
          message: err?.message || "Failed to copy portal link",
          variant: "danger",
        });
      } finally {
        setCopyingPortalId("");
      }
    },
    [alert, copyingPortalId]
  );

  const handleDeepLinkOpen = useCallback(
    (rawOpen) => {
      const { kind, id } = parseSimpleOpenParam(rawOpen);
      if (!id) return true;
      if (kind === "lead") {
        const lead = leadRows.find((r) => String(r.id) === id);
        if (lead) openRow(lead);
        return true;
      }
      const customer = customerRows.find((r) => String(r.id) === id);
      if (customer) openRow(customer);
      return true;
    },
    [leadRows, customerRows, openRow]
  );

  useSimpleOpenParam({
    ready: !loading,
    onOpen: handleDeepLinkOpen,
  });

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setConvertingFromLeadId(null);
    setForm({ ...INITIAL_CUSTOMER_FORM });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.companyName?.trim()) {
      await alert({ title: "Error", message: "Customer is required.", variant: "danger" });
      return;
    }
    setSaving(true);
    try {
      const pendingDocuments = Array.isArray(form.documents) ? form.documents : [];
      const payload = buildCustomerPayload(form);
      const res = await fetch("/api/dashboard/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create customer");
      const leadIdToMarkWon = convertingFromLeadId;
      if (leadIdToMarkWon) {
        try {
          await fetch(`/api/dashboard/leads/${leadIdToMarkWon}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ status: "won" }),
          });
        } catch {
          /* customer saved; status update is best-effort */
        }
      }
      const createdId = String(data?.customer?.id || data?.id || "").trim();
      if (createdId) {
        try {
          await uploadCustomerDocumentFiles(createdId, pendingDocuments);
        } catch (uploadErr) {
          await loadAll({ showError: false });
          setModalOpen(false);
          setConvertingFromLeadId(null);
          setForm({ ...INITIAL_CUSTOMER_FORM });
          if (createdId) setViewCustomerId(createdId);
          await alert({
            title: "Customer created",
            message: `Customer was saved, but document upload failed: ${uploadErr.message || "Upload failed"}`,
            variant: "danger",
          });
          return;
        }
      }
      await loadAll({ showError: false });
      setModalOpen(false);
      setConvertingFromLeadId(null);
      setForm({ ...INITIAL_CUSTOMER_FORM });
      await alert({
        title: "Success",
        message: leadIdToMarkWon ? "Customer created. Lead marked as Won." : "Customer added.",
      });
      if (createdId) setViewCustomerId(createdId);
    } catch (err) {
      await alert({
        title: "Error",
        message: err.message || "Failed to save customer",
        variant: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  const typeFilterCards = useMemo(() => {
    const tileFor = (index) => resolveStatusTileProps("", index);
    return [
      {
        key: FILTER_ALL,
        label: "All",
        count: customerTotalCount + leadTotalCount,
        amount: null,
        tileAppearance: tileFor(0),
        icon: FiLayers,
      },
      {
        key: FILTER_CUSTOMERS,
        label: "Customers",
        count: customerTotalCount,
        amount: null,
        tileAppearance: tileFor(2),
        icon: FiUser,
      },
      {
        key: FILTER_LEADS,
        label: "Leads",
        count: leadTotalCount,
        amount: null,
        tileAppearance: tileFor(4),
        icon: FiUserPlus,
      },
    ];
  }, [customerTotalCount, leadTotalCount]);

  const displayRows = showingLeads ? leadRows : customerRows;

  const columns = useMemo(
    () => [
      {
        key: "actions",
        label: "",
        sortable: false,
        className: "w-14",
        render: (_, row) => {
          if (row.recordType === TYPE_LEAD) return null;
          const busy = copyingPortalId === row.id;
          return (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                className="rounded p-0.5 text-primary hover:bg-primary/10 disabled:opacity-50"
                title="Copy customer portal link"
                aria-label="Copy customer portal link"
                disabled={Boolean(copyingPortalId)}
                onClick={(e) => {
                  e.stopPropagation();
                  void handleCopyPortalLink(row.id);
                }}
              >
                {busy ? (
                  <span
                    className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent"
                    aria-hidden
                  />
                ) : (
                  <FiCopy className="h-3.5 w-3.5" aria-hidden />
                )}
              </button>
            </div>
          );
        },
      },
      {
        key: "customerNumber",
        label: "ID",
        sortable: true,
        className: "w-20",
        render: (v, row) => (row.recordType === TYPE_LEAD ? "—" : v || "—"),
      },
      {
        key: "companyName",
        label: "Company",
        sortable: true,
        render: (v, row) => {
          const isLead = row.recordType === TYPE_LEAD;
          return (
            <div className="flex min-w-0 items-center gap-1.5">
              <Badge
                variant={isLead ? "warning" : "primary"}
                className="shrink-0 rounded-full px-1.5 py-0 text-[10px] font-medium leading-4"
              >
                {isLead ? TYPE_LEAD : TYPE_CUSTOMER}
              </Badge>
              <button
                type="button"
                className="min-w-0 truncate font-medium text-primary hover:underline"
                onClick={() => openRow(row)}
              >
                {v || "—"}
              </button>
            </div>
          );
        },
      },
      {
        key: "primaryContactName",
        label: "Contact",
        sortable: true,
        render: (v) => v || "—",
      },
      {
        key: "customerType",
        label: "Type",
        sortable: true,
        render: (v, row) => (row.recordType === TYPE_LEAD ? "—" : v || "—"),
      },
      {
        key: "phone",
        label: "Phone",
        sortable: true,
        render: (v) => v || "—",
      },
      {
        key: "email",
        label: "Email",
        sortable: true,
        render: (v) => v || "—",
      },
      {
        key: "paymentTerms",
        label: "Terms",
        sortable: true,
        render: (v, row) => (row.recordType === TYPE_LEAD ? "—" : v || "—"),
      },
      {
        key: "ein",
        label: "EIN",
        sortable: true,
        render: (v, row) => (row.recordType === TYPE_LEAD ? "—" : v || "—"),
      },
      {
        key: "creditLimit",
        label: "Credit Limit",
        sortable: true,
        render: (v, row) => (row.recordType === TYPE_LEAD ? "—" : v || "—"),
      },
      {
        key: "taxExempt",
        label: "Tax Exempted",
        sortable: true,
        render: (_, row) => {
          if (row.recordType === TYPE_LEAD) return "—";
          return (
            <Badge
              variant={row.taxExempt === false ? "warning" : "success"}
              className="rounded-full px-2.5 py-0.5 text-xs"
            >
              {row.taxExempt === false ? "No" : "Yes"}
            </Badge>
          );
        },
      },
      {
        key: "taxPercent",
        label: "Tax %",
        sortable: true,
        render: (_, row) => {
          if (row.recordType === TYPE_LEAD) return "—";
          return row.taxExempt === false ? row.taxPercent || "0" : "0";
        },
      },
      {
        key: "city",
        label: "City",
        sortable: true,
        render: (v) => v || "—",
      },
    ],
    [copyingPortalId, handleCopyPortalLink, openRow]
  );

  const emptyMessage = (() => {
    if (customerTotalCount === 0 && leadTotalCount === 0) {
      return "No customers or leads yet. Click Add New to create a customer, or wait for assigned leads.";
    }
    if (totalCount === 0 && searchQuery.trim()) return "No rows match your search.";
    if (typeFilter === FILTER_CUSTOMERS && totalCount === 0) {
      return "No customers yet. Click Add New to create one.";
    }
    if (typeFilter === FILTER_LEADS && totalCount === 0) {
      return "No leads assigned to this shop yet.";
    }
    if (totalCount === 0) return "No customers or leads yet.";
    return "No customers or leads yet.";
  })();

  return (
    <div className={SIMPLE_SCREEN_PANEL_CLASS}>
      <div className={`${SIMPLE_SCREEN_FILTERS_CLASS} shrink-0`}>
        {typeFilterCards.map((card) => (
          <StatusFilterPillButton
            key={card.key || "__all__"}
            card={card}
            active={(typeFilter || "") === (card.key || "")}
            onClick={() => {
              setPage(1);
              setTypeFilter(card.key || FILTER_ALL);
            }}
            formatAmount={() => ""}
          />
        ))}
      </div>

      <div className={SIMPLE_SCREEN_TABLE_WRAP_CLASS}>
        <Table
          columns={columns}
          data={displayRows}
          rowKey="rowKey"
          loading={loading}
          searchable
          onSearch={(q) => {
            setPage(1);
            setSearchQuery(q);
          }}
          searchPlaceholder="Search company, contact, email, type…"
          sortState={tableSort}
          onSort={(key, direction) => {
            setPage(1);
            setTableSort({ key, direction });
          }}
          onRefresh={() => loadAll({ showError: true })}
          toolbarBeforeSearch={
            <Button type="button" variant="primary" size="sm" className="h-9 !rounded-none px-2.5" onClick={openCreate}>
              <FiPlus className="h-4 w-4 shrink-0" aria-hidden />
              Add New
            </Button>
          }
          emptyMessage={emptyMessage}
          fillHeight
          responsive
          dense
          textSize="xs"
          paginateClientSide={false}
          pagination={{ page, pageSize, totalCount }}
          onPageChange={(nextPage, nextPageSize) => {
            setPage(nextPage);
            setPageSize(nextPageSize);
          }}
        />
      </div>

      <CustomerViewModal
        open={Boolean(viewCustomerId)}
        customerId={viewCustomerId}
        onClose={() => setViewCustomerId(null)}
        zIndex={120}
        portal="simple"
        onCustomerUpdated={() => {
          void loadAll({ showError: false });
        }}
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={convertingFromLeadId ? "Convert lead to customer" : "Add new customer"}
        size="6xl"
        width="min(1100px, 96vw)"
        height="min(84.6vh, 828px)"
        showClose={!saving}
        closeOnOutsideClick={false}
        actions={
          <Button type="submit" form={CUSTOMER_FORM_ID} variant="primary" size="sm" disabled={saving}>
            {saving ? "Saving…" : convertingFromLeadId ? "Create customer" : "Save"}
          </Button>
        }
      >
        <Form
          id={CUSTOMER_FORM_ID}
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-col gap-4 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
        >
          <SimpleCustomerFormFields form={form} setForm={setForm} />
        </Form>
      </Modal>

      <Modal
        open={!!leadDetail}
        onClose={() => setLeadDetail(null)}
        title="Lead"
        size="md"
        showClose
        closeOnOutsideClick
        actions={
          leadDetail ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => void startConvertLeadToCustomer(leadDetail)}
            >
              Convert to customer
            </Button>
          ) : null
        }
      >
        {leadDetail ? (
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="warning" className="rounded-full px-2.5 py-0.5 text-xs">
                Lead
              </Badge>
              <Badge
                variant={LEAD_STATUS_BADGE[leadDetail.leadStatus] || "default"}
                className="rounded-full px-2.5 py-0.5 text-xs"
              >
                {LEAD_STATUS_LABEL[leadDetail.leadStatus] || leadDetail.leadStatus || "New"}
              </Badge>
            </div>
            <dl className="grid gap-2 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold text-secondary">Company</dt>
                <dd className="text-title">{leadDetail.companyName || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-secondary">Contact</dt>
                <dd className="text-title">{leadDetail.primaryContactName || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-secondary">Phone</dt>
                <dd className="text-title">{leadDetail.phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-secondary">Email</dt>
                <dd className="text-title">{leadDetail.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-secondary">City</dt>
                <dd className="text-title">{leadDetail.city || "—"}</dd>
              </div>
            </dl>
            {String(leadDetail.leadRaw?.message || leadDetail.leadRaw?.problemDescription || "").trim() ? (
              <div>
                <dt className="text-xs font-bold text-secondary">Notes</dt>
                <p className="mt-0.5 whitespace-pre-wrap text-title">
                  {String(leadDetail.leadRaw?.message || leadDetail.leadRaw?.problemDescription || "").trim()}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
