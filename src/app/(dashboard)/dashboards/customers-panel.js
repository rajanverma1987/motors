"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Table from "@/components/ui/table";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import { Form } from "@/components/ui/form-layout";
import Modal from "@/components/ui/modal";
import SimpleCustomerFormFields from "@/components/simple/simple-customer-form-fields";
import { useAlert } from "@/components/confirm-provider";
import {
  buildCustomerPayload,
  customerApiToForm,
  INITIAL_CUSTOMER_FORM,
} from "@/lib/customer-record-form";
import { fetchAllPaginatedDashboardItems } from "@/lib/fetch-all-paginated-dashboard-items";

const CUSTOMER_FORM_ID = "simple-customers-panel-form";

export default function CustomersPanel({ createNonce = 0 }) {
  const alert = useAlert();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(INITIAL_CUSTOMER_FORM);
  const [saving, setSaving] = useState(false);

  const loadCustomers = useCallback(async ({ showError = true } = {}) => {
    setLoading(true);
    try {
      const list = await fetchAllPaginatedDashboardItems("/api/dashboard/customers");
      setRows(Array.isArray(list) ? list : []);
    } catch (err) {
      setRows([]);
      if (showError) {
        await alert({
          title: "Error",
          message: err.message || "Failed to load customers",
          variant: "danger",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [alert]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await fetchAllPaginatedDashboardItems("/api/dashboard/customers");
        if (cancelled) return;
        setRows(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm({ ...INITIAL_CUSTOMER_FORM });
    setModalOpen(true);
  }, []);

  useEffect(() => {
    if (!createNonce) return;
    openCreate();
  }, [createNonce, openCreate]);

  const openEdit = useCallback(async (row) => {
    const id = String(row?.id || "").trim();
    if (!id) return;
    setSaving(false);
    setEditingId(id);
    setForm(customerApiToForm(row));
    setModalOpen(true);
    try {
      const res = await fetch(`/api/dashboard/customers/${id}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load customer");
      if (data.customer) setForm(customerApiToForm(data.customer));
    } catch (err) {
      await alert({
        title: "Error",
        message: err.message || "Failed to load customer",
        variant: "danger",
      });
    }
  }, [alert]);

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingId(null);
    setForm({ ...INITIAL_CUSTOMER_FORM });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.companyName?.trim()) {
      await alert({ title: "Error", message: "Company name is required.", variant: "danger" });
      return;
    }
    setSaving(true);
    try {
      const payload = buildCustomerPayload(form);
      const url = editingId ? `/api/dashboard/customers/${editingId}` : "/api/dashboard/customers";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || (editingId ? "Failed to update customer" : "Failed to create customer"));
      await loadCustomers();
      setModalOpen(false);
      setEditingId(null);
      setForm({ ...INITIAL_CUSTOMER_FORM });
      await alert({
        title: "Success",
        message: editingId ? "Customer updated." : "Customer added.",
      });
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

  const displayRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const haystack = [
        row.companyName,
        row.primaryContactName,
        row.phone,
        row.email,
        row.ein,
        row.creditLimit,
        row.city,
        row.state,
        row.taxExempt === false ? "no" : "yes",
        row.taxPercent,
      ]
        .map((v) => String(v ?? "").toLowerCase())
        .join(" ");
      return haystack.includes(q);
    });
  }, [rows, searchQuery]);

  const columns = useMemo(
    () => [
      {
        key: "companyName",
        label: "Company",
        sortable: true,
        render: (v, row) => (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => openEdit(row)}
          >
            {v || "—"}
          </button>
        ),
      },
      {
        key: "primaryContactName",
        label: "Contact",
        sortable: true,
        render: (v) => v || "—",
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
        key: "ein",
        label: "EIN",
        sortable: true,
        render: (v) => v || "—",
      },
      {
        key: "creditLimit",
        label: "Credit Limit",
        sortable: true,
        render: (v) => v || "—",
      },
      {
        key: "taxExempt",
        label: "Tax Exempted",
        sortable: true,
        render: (_, row) => (
          <Badge
            variant={row.taxExempt === false ? "warning" : "success"}
            className="rounded-full px-2.5 py-0.5 text-xs"
          >
            {row.taxExempt === false ? "No" : "Yes"}
          </Badge>
        ),
      },
      {
        key: "taxPercent",
        label: "Tax %",
        sortable: true,
        render: (_, row) => (row.taxExempt === false ? row.taxPercent || "0" : "0"),
      },
      {
        key: "city",
        label: "City",
        sortable: true,
        render: (v) => v || "—",
      },
    ],
    [openEdit]
  );

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Table
          columns={columns}
          data={displayRows}
          rowKey="id"
          loading={loading}
          searchable
          onSearch={setSearchQuery}
          searchPlaceholder="Search company, contact, email…"
          onRefresh={() => loadCustomers({ showError: true })}
          emptyMessage={
            rows.length === 0
              ? "No customers yet. Click Add New to create one."
              : searchQuery.trim()
                ? "No customers match your search."
                : "No customers yet."
          }
          fillHeight
          responsive
          dense
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? "Edit customer" : "Add new customer"}
        size="6xl"
        width="min(1100px, 96vw)"
        height="min(84.6vh, 828px)"
        showClose={!saving}
        closeOnOutsideClick={false}
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form={CUSTOMER_FORM_ID} variant="primary" size="sm" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
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
    </div>
  );
}
