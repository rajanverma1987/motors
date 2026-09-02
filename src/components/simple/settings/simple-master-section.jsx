"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiEdit2 } from "react-icons/fi";
import Tabs from "@/components/ui/tabs";
import Table from "@/components/ui/table";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import { Form } from "@/components/ui/form-layout";
import SimpleSelect from "@/components/simple/simple-select";
import SimpleVendorFormFields from "@/components/simple/simple-vendor-form-fields";
import SimpleVendorFormModal from "@/components/simple/simple-vendor-form-modal";
import { useAlert } from "@/components/confirm-provider";
import { usePreferredTablePageSize } from "@/contexts/user-settings-context";
import { SIMPLE_MASTER_TABS } from "@/lib/simple-settings-nav";
import {
  buildVendorPayload,
  INITIAL_VENDOR_FORM,
} from "@/lib/vendor-record-form";

const FIELD_INPUT =
  "h-7 w-full min-w-0 rounded-none border border-border bg-primary/[0.04] px-1.5 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_TEXTAREA =
  "w-full min-w-0 resize-y rounded-none border border-border bg-primary/[0.04] px-1.5 py-1 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";
const FIELD_LABEL = "shrink-0 whitespace-nowrap text-right text-xs font-bold text-title";
const SECTION_TITLE = "mb-1.5 text-xs font-bold uppercase tracking-wide text-secondary";

const INITIAL_SALES_PERSON_FORM = {
  name: "",
  phone: "",
  email: "",
  bankDetail: "",
};

const VENDOR_CREATE_FORM_ID = "simple-master-vendor-create-form";
const SALES_PERSON_FORM_ID = "simple-master-sales-person-form";

function FieldRow({ label, labelWidth = "6.75rem", children, className = "", controlClassName = "" }) {
  return (
    <div className={`flex min-w-0 items-center gap-2.5 ${className}`}>
      <label className={FIELD_LABEL} style={{ width: labelWidth }}>
        {label}
      </label>
      <div className={`min-w-0 ${controlClassName || "flex-1"}`}>{children}</div>
    </div>
  );
}

function buildSalesPersonPayload(form) {
  return {
    name: form?.name ?? "",
    phone: form?.phone ?? "",
    email: form?.email ?? "",
    bankDetail: form?.bankDetail ?? "",
  };
}

function VendorsTab() {
  const alert = useAlert();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePreferredTablePageSize();
  const [totalCount, setTotalCount] = useState(0);
  const [tableSort, setTableSort] = useState({ key: "name", direction: "asc" });
  const [editVendorId, setEditVendorId] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(INITIAL_VENDOR_FORM);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (tableSort?.key) {
        params.set("sortBy", tableSort.key);
        params.set("sortDir", tableSort.direction || "asc");
      }
      const res = await fetch(`/api/dashboard/vendors?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load vendors");
      setRows(Array.isArray(data?.items) ? data.items : []);
      setTotalCount(Number(data?.totalCount) || 0);
    } catch (err) {
      await alert({
        title: "Error",
        message: err.message || "Failed to load vendors",
        variant: "danger",
      });
      setRows([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [alert, page, pageSize, searchQuery, tableSort]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setForm(INITIAL_VENDOR_FORM);
    setCreateOpen(true);
  };

  const closeCreate = () => {
    if (saving) return;
    setCreateOpen(false);
    setForm(INITIAL_VENDOR_FORM);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!String(form.name || "").trim()) {
      await alert({ title: "Error", message: "Vendor name is required.", variant: "danger" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildVendorPayload(form)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create vendor");
      await alert({ title: "Success", message: "Vendor added." });
      setCreateOpen(false);
      setForm(INITIAL_VENDOR_FORM);
      setLoading(true);
      await load();
    } catch (err) {
      await alert({
        title: "Error",
        message: err.message || "Failed to create vendor",
        variant: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "actions",
        label: "",
        render: (_, row) => (
          <button
            type="button"
            onClick={() => setEditVendorId(row.id)}
            className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Edit"
            title="Edit"
          >
            <FiEdit2 className="h-4 w-4" />
          </button>
        ),
      },
      { key: "name", label: "Name", sortable: true },
      {
        key: "contactName",
        label: "Contact",
        sortable: true,
        render: (_, row) => row.contactName || "—",
      },
      { key: "phone", label: "Phone", sortable: true },
      { key: "email", label: "Email", sortable: true },
    ],
    []
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-secondary">Suppliers and parts vendors.</p>
        <Button variant="primary" size="sm" onClick={openCreate} className="shrink-0">
          Add Vendor
        </Button>
      </div>

      <Table
        columns={columns}
        data={rows}
        rowKey="id"
        loading={loading}
        emptyMessage={rows.length === 0 ? "No vendors yet. Use “Add Vendor” to add one." : "No vendors match the search."}
        searchable
        onSearch={(q) => {
          setPage(1);
          setSearchQuery(q);
        }}
        searchPlaceholder="Search name, contact, phone, email…"
        onRefresh={async () => {
          setLoading(true);
          await load();
        }}
        sortState={tableSort}
        onSort={(key, direction) => {
          setPage(1);
          setTableSort({ key, direction });
        }}
        responsive
        pagination={{ page, pageSize, totalCount }}
        onPageChange={(nextPage, nextPageSize) => {
          setPage(nextPage);
          setPageSize(nextPageSize);
        }}
        paginateClientSide={false}
      />

      <Modal
        open={createOpen}
        onClose={closeCreate}
        title="Add Vendor"
        size="4xl"
        width="min(900px, 96vw)"
        height="min(84vh, 820px)"
        showClose={!saving}
        closeOnOutsideClick={false}
        actions={
          <Button type="submit" form={VENDOR_CREATE_FORM_ID} variant="primary" size="sm" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        }
      >
        <Form
          id={VENDOR_CREATE_FORM_ID}
          onSubmit={handleCreate}
          className="flex flex-col gap-3 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
        >
          <SimpleVendorFormFields form={form} setForm={setForm} disabled={saving} />
        </Form>
      </Modal>

      <SimpleVendorFormModal
        open={Boolean(editVendorId)}
        vendorId={editVendorId}
        relatedPos={[]}
        onClose={() => setEditVendorId(null)}
        onVendorUpdated={() => {
          void load();
        }}
      />
    </div>
  );
}

function SalesPersonsTab() {
  const alert = useAlert();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePreferredTablePageSize();
  const [totalCount, setTotalCount] = useState(0);
  const [tableSort, setTableSort] = useState({ key: "name", direction: "asc" });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(INITIAL_SALES_PERSON_FORM);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (tableSort?.key) {
        params.set("sortBy", tableSort.key);
        params.set("sortDir", tableSort.direction || "asc");
      }
      const res = await fetch(`/api/dashboard/sales-persons?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load sales persons");
      setRows(Array.isArray(data?.items) ? data.items : []);
      setTotalCount(Number(data?.totalCount) || 0);
    } catch (err) {
      await alert({
        title: "Error",
        message: err.message || "Failed to load sales persons",
        variant: "danger",
      });
      setRows([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [alert, page, pageSize, searchQuery, tableSort]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(INITIAL_SALES_PERSON_FORM);
    setModalOpen(true);
  };

  const openEdit = async (row) => {
    if (!row?.id) return;
    try {
      const res = await fetch(`/api/dashboard/sales-persons/${row.id}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load sales person");
      setEditingId(data.id);
      setForm({
        name: data.name ?? "",
        phone: data.phone ?? "",
        email: data.email ?? "",
        bankDetail: data.bankDetail ?? "",
      });
      setModalOpen(true);
    } catch (err) {
      await alert({
        title: "Error",
        message: err.message || "Failed to load sales person",
        variant: "danger",
      });
    }
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingId(null);
    setForm(INITIAL_SALES_PERSON_FORM);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!String(form.name || "").trim()) {
      await alert({ title: "Error", message: "Name is required.", variant: "danger" });
      return;
    }
    setSaving(true);
    try {
      const isEdit = Boolean(editingId);
      const res = await fetch(
        isEdit ? `/api/dashboard/sales-persons/${editingId}` : "/api/dashboard/sales-persons",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(buildSalesPersonPayload(form)),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || (isEdit ? "Failed to update sales person" : "Failed to create sales person"));
      }
      await alert({
        title: "Success",
        message: isEdit ? "Sales person updated." : "Sales person added.",
      });
      setModalOpen(false);
      setEditingId(null);
      setForm(INITIAL_SALES_PERSON_FORM);
      setLoading(true);
      await load();
    } catch (err) {
      await alert({
        title: "Error",
        message: err.message || "Failed to save sales person",
        variant: "danger",
      });
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "actions",
        label: "",
        render: (_, row) => (
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label="Edit"
            title="Edit"
          >
            <FiEdit2 className="h-4 w-4" />
          </button>
        ),
      },
      { key: "name", label: "Name", sortable: true },
      { key: "phone", label: "Phone", sortable: true },
      { key: "email", label: "Email", sortable: true },
      {
        key: "bankDetail",
        label: "Bank Detail",
        sortable: true,
        render: (_, row) => (
          <span className="line-clamp-2 max-w-xs whitespace-pre-wrap text-sm">{row.bankDetail || "—"}</span>
        ),
      },
    ],
    []
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-secondary">Sales contacts and payout banking details.</p>
        <Button variant="primary" size="sm" onClick={openCreate} className="shrink-0">
          Add Sales Person
        </Button>
      </div>

      <Table
        columns={columns}
        data={rows}
        rowKey="id"
        loading={loading}
        emptyMessage={
          rows.length === 0
            ? "No sales persons yet. Use “Add Sales Person” to create one."
            : "No matching sales persons found."
        }
        searchable
        onSearch={(q) => {
          setPage(1);
          setSearchQuery(q);
        }}
        searchPlaceholder="Search by name, phone, email, bank detail…"
        onRefresh={async () => {
          setLoading(true);
          await load();
        }}
        sortState={tableSort}
        onSort={(key, direction) => {
          setPage(1);
          setTableSort({ key, direction });
        }}
        responsive
        pagination={{ page, pageSize, totalCount }}
        onPageChange={(nextPage, nextPageSize) => {
          setPage(nextPage);
          setPageSize(nextPageSize);
        }}
        paginateClientSide={false}
      />

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? "Edit Sales Person" : "Add Sales Person"}
        size="lg"
        showClose={!saving}
        closeOnOutsideClick={false}
        actions={
          <Button type="submit" form={SALES_PERSON_FORM_ID} variant="primary" size="sm" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        }
      >
        <Form
          id={SALES_PERSON_FORM_ID}
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none"
        >
          <p className={SECTION_TITLE}>Sales person</p>
          <FieldRow label="Name">
            <input
              type="text"
              required
              disabled={saving}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={FIELD_INPUT}
              aria-label="Name"
            />
          </FieldRow>
          <FieldRow label="Phone">
            <input
              type="tel"
              disabled={saving}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className={FIELD_INPUT}
              aria-label="Phone"
            />
          </FieldRow>
          <FieldRow label="Email">
            <input
              type="email"
              disabled={saving}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={FIELD_INPUT}
              aria-label="Email"
            />
          </FieldRow>
          <FieldRow label="Bank Detail" className="items-start">
            <textarea
              rows={4}
              disabled={saving}
              value={form.bankDetail}
              onChange={(e) => setForm((f) => ({ ...f, bankDetail: e.target.value }))}
              className={FIELD_TEXTAREA}
              placeholder="Bank account / payout detail"
              aria-label="Bank Detail"
            />
          </FieldRow>
        </Form>
      </Modal>
    </div>
  );
}

/**
 * Simple portal Master settings: Vendors | Sales Persons.
 */
export default function SimpleMasterSection({ masterTab = "vendors", onMasterTabChange }) {
  const tabs = useMemo(
    () =>
      SIMPLE_MASTER_TABS.map((tab) => ({
        id: tab.id,
        label: tab.label,
        children: tab.id === "vendors" ? <VendorsTab /> : <SalesPersonsTab />,
      })),
    []
  );

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="mb-4 shrink-0">
        <h2 className="text-xl font-bold text-title">Master</h2>
        <p className="mt-1 text-sm text-secondary">Vendors and sales persons.</p>
      </div>
      <Tabs
        value={masterTab}
        onChange={(id) => onMasterTabChange?.(id)}
        tabs={tabs}
        ariaLabel="Master sections"
        panelClassName="flex min-h-0 min-w-0 flex-1 flex-col pt-4"
        tabButtonClassName="rounded-none"
        listClassName="rounded-none"
      />
    </div>
  );
}
