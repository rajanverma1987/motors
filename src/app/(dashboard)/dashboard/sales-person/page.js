"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiDollarSign, FiEdit2 } from "react-icons/fi";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Table from "@/components/ui/table";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useFormatMoney } from "@/contexts/user-settings-context";

function formatDateShort(dateValue) {
  if (!dateValue) return "—";
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" });
}

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
  const fmt = useFormatMoney();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [tableSort, setTableSort] = useState({ key: "name", direction: "asc" });
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [commissionsModalOpen, setCommissionsModalOpen] = useState(false);
  const [commissionsModalPerson, setCommissionsModalPerson] = useState(null);
  const [commissionsForPerson, setCommissionsForPerson] = useState([]);
  const [commissionsLoading, setCommissionsLoading] = useState(false);

  const loadSalesPersons = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (tableSort?.key) {
        params.set("sortBy", tableSort.key);
        params.set("sortDir", tableSort.direction || "asc");
      }
      const res = await fetch(`/api/dashboard/sales-persons?${params.toString()}`, { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load sales persons");
      setRows(Array.isArray(data?.items) ? data.items : []);
      setTotalCount(Number(data?.totalCount) || 0);
    } catch (err) {
      toast.error(err.message || "Failed to load sales persons");
      setRows([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [toast, page, pageSize, searchQuery, tableSort]);

  useEffect(() => {
    loadSalesPersons();
  }, [loadSalesPersons]);

  const openCommissionsModal = useCallback((row) => {
    if (!row?.id) return;
    setCommissionsModalPerson({
      id: row.id,
      name: row.name || row.email || row.phone || "Sales person",
    });
    setCommissionsModalOpen(true);
  }, []);

  const closeCommissionsModal = useCallback(() => {
    setCommissionsModalOpen(false);
    setCommissionsModalPerson(null);
    setCommissionsForPerson([]);
  }, []);

  useEffect(() => {
    if (!commissionsModalOpen || !commissionsModalPerson?.id) return;
    let cancelled = false;
    setCommissionsLoading(true);
    setCommissionsForPerson([]);
    (async () => {
      try {
        const qs = new URLSearchParams({ salesPersonId: commissionsModalPerson.id });
        const res = await fetch(`/api/dashboard/sales-commissions?${qs}`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error || "Failed to load commissions");
        setCommissionsForPerson(Array.isArray(data.commissions) ? data.commissions : []);
      } catch (err) {
        if (!cancelled) {
          toast.error(err.message || "Failed to load commissions");
          setCommissionsForPerson([]);
        }
      } finally {
        if (!cancelled) setCommissionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [commissionsModalOpen, commissionsModalPerson?.id, toast]);

  const commissionColumns = useMemo(
    () => [
      {
        key: "jobNumber",
        label: "Job#",
        render: (_, row) => {
          const label = row.jobNumber || row.rfqNumber || "—";
          const rawTotal = row.jobTotalAmount;
          const hasTotal =
            rawTotal != null && rawTotal !== "" && Number.isFinite(Number(rawTotal));
          const totalNum = hasTotal ? Number(rawTotal) : null;
          const statusText = row.jobStatus ? String(row.jobStatus).trim() : "";
          const bits = [];
          if (hasTotal && totalNum != null) bits.push(`Job total ${fmt(totalNum)}`);
          if (statusText) bits.push(statusText);
          if (bits.length === 0) return label;
          return (
            <div className="min-w-0 max-w-md text-left" title={[label, ...bits].join(" · ")}>
              <span className="font-medium text-title">{label}</span>
              <span className="text-secondary">
                {" · "}
                {bits.join(" · ")}
              </span>
            </div>
          );
        },
      },
      {
        key: "amount",
        label: "Amount",
        render: (_, row) => fmt(row.amount || 0),
      },
      {
        key: "status",
        label: "Status",
        render: (_, row) => (
          <Badge
            variant={row.status === "paid" ? "success" : "warning"}
            className="rounded-full px-2.5 py-0.5 text-xs"
          >
            {row.status === "paid" ? "Paid" : "Unpaid"}
          </Badge>
        ),
      },
      {
        key: "paidAt",
        label: "Paid date",
        render: (_, row) => formatDateShort(row.paidAt),
      },
      {
        key: "createdAt",
        label: "Created",
        render: (_, row) => formatDateShort(row.createdAt),
      },
    ],
    [fmt]
  );

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

  const handleTableSort = useCallback((key, direction) => {
    setPage(1);
    setTableSort({ key, direction });
  }, []);

  const columns = useMemo(
    () => [
      {
        key: "actions",
        label: "",
        render: (_, row) => (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => openCommissionsModal(row)}
              className="rounded p-1.5 text-secondary hover:bg-card hover:text-title focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="View commissions"
              title="Commissions"
            >
              <FiDollarSign className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => openEdit(row)}
              className="rounded p-1.5 text-primary hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Edit"
              title="Edit"
            >
              <FiEdit2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
      { key: "name", label: "Name", sortable: true },
      { key: "phone", label: "Phone", sortable: true },
      { key: "email", label: "Email", sortable: true },
      { key: "bankDetail", label: "Bank Detail", sortable: true },
    ],
    [openCommissionsModal]
  );

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-title">Sales Person</h1>
          <p className="mt-1 text-sm text-secondary">
            Sales contacts and payout banking details.
          </p>
        </div>
        <Button variant="primary" onClick={openCreate} className="shrink-0">
          Add New
        </Button>
      </div>

      <div className="mt-6 flex min-h-0 min-w-0 flex-1 flex-col">
        <Table
          columns={columns}
          data={rows}
          rowKey="id"
          loading={loading}
          emptyMessage={rows.length === 0 ? "No sales persons yet. Use Add New to create one." : "No matching sales persons found."}
          searchable
          onSearch={(q) => {
            setPage(1);
            setSearchQuery(q);
          }}
          searchPlaceholder="Search by name, phone, email, bank detail..."
          onRefresh={async () => {
            setLoading(true);
            await loadSalesPersons();
          }}
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

      <Modal
        open={commissionsModalOpen}
        onClose={closeCommissionsModal}
        title={
          commissionsModalPerson
            ? `Commissions — ${commissionsModalPerson.name}`
            : "Commissions"
        }
        size="4xl"
      >
        {commissionsLoading ? (
          <div className="flex justify-center py-12 text-secondary">Loading…</div>
        ) : (
          <Table
            columns={commissionColumns}
            data={commissionsForPerson}
            rowKey="id"
            loading={false}
            emptyMessage="No commissions for this sales person yet."
            responsive
          />
        )}
      </Modal>

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
        title="Edit Sales Person"
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
