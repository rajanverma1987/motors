"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiEye } from "react-icons/fi";
import Button from "@/components/ui/button";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";

const INITIAL_FORM = {
  name: "",
  phone: "",
  email: "",
  bankDetail: "",
};

function buildPayload(form) {
  return {
    name: form?.name ?? "",
    phone: form?.phone ?? "",
    email: form?.email ?? "",
    bankDetail: form?.bankDetail ?? "",
  };
}

export default function DashboardSalesPersonPage() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);

  const loadSalesPersons = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/sales-persons", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load sales persons");
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.message || "Failed to load sales persons");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSalesPersons();
  }, [loadSalesPersons]);

  const openCreate = () => {
    setForm(INITIAL_FORM);
    setIsCreateOpen(true);
  };

  const closeCreate = () => setIsCreateOpen(false);
  const closeEdit = () => {
    setIsEditOpen(false);
    setEditingId(null);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard/sales-persons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildPayload(form)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create sales person");
      toast.success("Sales person added.");
      setRows((prev) => [data.salesPerson, ...prev]);
      closeCreate();
    } catch (err) {
      toast.error(err.message || "Failed to create sales person");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = async (row) => {
    if (!row?.id) return;
    setSaving(false);
    try {
      const res = await fetch(`/api/dashboard/sales-persons/${row.id}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load sales person");
      setForm({
        name: data.name ?? "",
        phone: data.phone ?? "",
        email: data.email ?? "",
        bankDetail: data.bankDetail ?? "",
      });
      setEditingId(data.id);
      setIsEditOpen(true);
    } catch (err) {
      toast.error(err.message || "Failed to load sales person");
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/dashboard/sales-persons/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildPayload(form)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update sales person");
      setRows((prev) => prev.map((item) => (item.id === editingId ? data.salesPerson : item)));
      toast.success("Sales person updated.");
      closeEdit();
    } catch (err) {
      toast.error(err.message || "Failed to update sales person");
    } finally {
      setSaving(false);
    }
  };

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      return (
        (row.name || "").toLowerCase().includes(q) ||
        (row.phone || "").toLowerCase().includes(q) ||
        (row.email || "").toLowerCase().includes(q) ||
        (row.bankDetail || "").toLowerCase().includes(q)
      );
    });
  }, [rows, searchQuery]);

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
            aria-label="View"
            title="View"
          >
            <FiEye className="h-4 w-4" />
          </button>
        ),
      },
      { key: "name", label: "Name" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "bankDetail", label: "Bank Detail" },
    ],
    []
  );

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden px-4 py-8">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-title">Sales Person</h1>
          <p className="mt-1 text-sm text-secondary">
            Manage your sales team contacts and bank details for payouts and commissions.
          </p>
        </div>
        <Button variant="primary" onClick={openCreate} className="shrink-0">
          Add New
        </Button>
      </div>

      <div className="mt-6 flex min-h-0 min-w-0 flex-1 flex-col">
        <Table
          columns={columns}
          data={filteredRows}
          rowKey="id"
          loading={loading}
          emptyMessage={rows.length === 0 ? "No sales persons yet. Use Add New to create one." : "No matching sales persons found."}
          searchable
          onSearch={setSearchQuery}
          searchPlaceholder="Search by name, phone, email, bank detail..."
          onRefresh={async () => {
            setLoading(true);
            await loadSalesPersons();
          }}
          responsive
        />
      </div>

      <Modal
        open={isCreateOpen}
        onClose={closeCreate}
        title="Add Sales Person"
        size="xl"
        actions={
          <Button type="submit" form="create-sales-person-form" variant="primary" size="sm" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        }
      >
        <Form id="create-sales-person-form" onSubmit={handleCreate} className="flex flex-col gap-4 !space-y-0">
          <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-3">
            <Input
              label="Name"
              name="name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Full name"
              required
            />
            <Input
              label="Phone"
              name="phone"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="Phone number"
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Email address"
            />
            <Textarea
              label="Bank Detail"
              name="bankDetail"
              value={form.bankDetail}
              onChange={(e) => setForm((prev) => ({ ...prev, bankDetail: e.target.value }))}
              placeholder="Bank account / payout detail"
              rows={4}
              className="sm:col-span-3"
            />
          </div>
        </Form>
      </Modal>

      <Modal
        open={isEditOpen}
        onClose={closeEdit}
        title="View Sales Person"
        size="xl"
        actions={
          <Button type="submit" form="edit-sales-person-form" variant="primary" size="sm" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        }
      >
        <Form id="edit-sales-person-form" onSubmit={handleEdit} className="flex flex-col gap-4 !space-y-0">
          <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-3">
            <Input
              label="Name"
              name="name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Full name"
              required
            />
            <Input
              label="Phone"
              name="phone"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="Phone number"
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Email address"
            />
            <Textarea
              label="Bank Detail"
              name="bankDetail"
              value={form.bankDetail}
              onChange={(e) => setForm((prev) => ({ ...prev, bankDetail: e.target.value }))}
              placeholder="Bank account / payout detail"
              rows={4}
              className="sm:col-span-3"
            />
          </div>
        </Form>
      </Modal>
    </div>
  );
}
