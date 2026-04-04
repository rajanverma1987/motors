"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { FiRotateCw, FiCheck } from "react-icons/fi";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Textarea from "@/components/ui/textarea";
import Badge from "@/components/ui/badge";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useFormatMoney } from "@/contexts/user-settings-context";

const COMMISSION_INITIAL = {
  salesPersonId: "",
  jobNumber: "",
  amount: "",
};

const SALES_PERSON_INITIAL = {
  name: "",
  phone: "",
  email: "",
  bankDetail: "",
};

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} [props.repairFlowJobId] — MotorRepairJob id
 * @param {string} [props.jobNumber] — display Job# (optional; server resolves from job if omitted)
 */
export default function SalesCommissionModal({ open, onClose, repairFlowJobId, jobNumber }) {
  const toast = useToast();
  const fmt = useFormatMoney();

  const [salesPersons, setSalesPersons] = useState([]);
  const [commissionForm, setCommissionForm] = useState(COMMISSION_INITIAL);
  const [commissionRows, setCommissionRows] = useState([]);
  const [commissionLoading, setCommissionLoading] = useState(false);
  const [commissionSaving, setCommissionSaving] = useState(false);
  const [commissionStatusSavingId, setCommissionStatusSavingId] = useState("");

  const [quickSalesPersonModalOpen, setQuickSalesPersonModalOpen] = useState(false);
  const [quickSalesPersonForm, setQuickSalesPersonForm] = useState(SALES_PERSON_INITIAL);
  const [quickSalesPersonSaving, setQuickSalesPersonSaving] = useState(false);

  const salesPersonOptions = useMemo(
    () => [
      ...salesPersons.map((sp) => ({
        value: sp.id,
        label: sp.name || sp.email || sp.phone || sp.id || "—",
      })),
      { value: "__add_sales_person__", label: "+ Add new" },
    ],
    [salesPersons]
  );

  const salesPersonNameMap = useMemo(() => {
    const map = {};
    for (const sp of salesPersons) {
      map[sp.id] = sp.name || sp.email || sp.phone || sp.id || "—";
    }
    return map;
  }, [salesPersons]);

  const reset = useCallback(() => {
    setCommissionForm(COMMISSION_INITIAL);
    setCommissionRows([]);
    setCommissionLoading(false);
    setCommissionSaving(false);
    setCommissionStatusSavingId("");
    setQuickSalesPersonModalOpen(false);
    setQuickSalesPersonForm(SALES_PERSON_INITIAL);
  }, []);

  useEffect(() => {
    if (!open || !repairFlowJobId) return;
    const jn = String(jobNumber || "").trim();
    setCommissionForm({ ...COMMISSION_INITIAL, jobNumber: jn });
    setCommissionRows([]);
    let cancelled = false;
    (async () => {
      setCommissionLoading(true);
      try {
        const [spRes, cRes] = await Promise.all([
          fetch("/api/dashboard/sales-persons", { credentials: "include", cache: "no-store" }),
          fetch(`/api/dashboard/sales-commissions?repairFlowJobId=${encodeURIComponent(repairFlowJobId)}`, {
            credentials: "include",
            cache: "no-store",
          }),
        ]);
        const spData = await spRes.json().catch(() => []);
        const cData = await cRes.json().catch(() => ({}));
        if (cancelled) return;
        if (spRes.ok && Array.isArray(spData)) {
          setSalesPersons(spData);
        }
        if (cRes.ok && Array.isArray(cData?.commissions)) {
          const list = cData.commissions;
          setCommissionRows(list);
          const jFromRow = String(list[0]?.jobNumber || "").trim();
          if (jFromRow) {
            setCommissionForm((prev) => ({ ...prev, jobNumber: prev.jobNumber || jFromRow }));
          }
        } else if (!cRes.ok) {
          toast.error(cData.error || "Failed to load sales commission");
        }
      } catch {
        if (!cancelled) toast.error("Failed to load");
      } finally {
        if (!cancelled) setCommissionLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, repairFlowJobId, jobNumber, toast]);

  useEffect(() => {
    if (!open || !repairFlowJobId) return;
    const jn = String(jobNumber || "").trim();
    if (!jn) return;
    setCommissionForm((prev) => (prev.jobNumber === jn ? prev : { ...prev, jobNumber: jn }));
  }, [jobNumber, open, repairFlowJobId]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleCommissionSalesPersonChange = (e) => {
    const value = e.target?.value ?? "";
    if (value === "__add_sales_person__") {
      setQuickSalesPersonForm(SALES_PERSON_INITIAL);
      setQuickSalesPersonModalOpen(true);
      return;
    }
    setCommissionForm((prev) => ({ ...prev, salesPersonId: value }));
  };

  const handleQuickSalesPersonSubmit = async (e) => {
    e.preventDefault();
    setQuickSalesPersonSaving(true);
    try {
      const res = await fetch("/api/dashboard/sales-persons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(quickSalesPersonForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create sales person");
      setSalesPersons((prev) => [data.salesPerson, ...prev]);
      setCommissionForm((prev) => ({ ...prev, salesPersonId: data.salesPerson?.id || "" }));
      setQuickSalesPersonModalOpen(false);
      setQuickSalesPersonForm(SALES_PERSON_INITIAL);
      toast.success("Sales person added.");
    } catch (err) {
      toast.error(err.message || "Failed to create sales person");
    } finally {
      setQuickSalesPersonSaving(false);
    }
  };

  const handleCommissionSubmit = async (e) => {
    e.preventDefault();
    if (!repairFlowJobId) return;
    if (!commissionForm.salesPersonId) {
      toast.error("Sales person is required.");
      return;
    }
    const amountNum = Number(commissionForm.amount);
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      toast.error("Amount must be a valid number.");
      return;
    }
    setCommissionSaving(true);
    try {
      const res = await fetch("/api/dashboard/sales-commissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          repairFlowJobId,
          jobNumber: commissionForm.jobNumber,
          salesPersonId: commissionForm.salesPersonId,
          amount: amountNum,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save sales commission");
      toast.success("Sales commission saved.");
      setCommissionRows((prev) => [data.commission, ...prev]);
      setCommissionForm((prev) => ({ ...prev, salesPersonId: "", amount: "" }));
    } catch (err) {
      toast.error(err.message || "Failed to save sales commission");
    } finally {
      setCommissionSaving(false);
    }
  };

  const handleCommissionMarkPaid = async (commissionId) => {
    if (!commissionId) return;
    setCommissionStatusSavingId(commissionId);
    try {
      const res = await fetch(`/api/dashboard/sales-commissions/${commissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "paid" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to mark commission paid");
      setCommissionRows((prev) => prev.map((row) => (row.id === commissionId ? data.commission : row)));
      toast.success("Commission marked as paid.");
    } catch (err) {
      toast.error(err.message || "Failed to update commission");
    } finally {
      setCommissionStatusSavingId("");
    }
  };

  return (
    <>
      <Modal
        open={open && !!repairFlowJobId}
        onClose={handleClose}
        title="Sales Commission"
        size="full"
        width="70vw"
        zIndex={110}
        actions={
          <Button
            type="submit"
            form="sales-commission-form-shared"
            variant="primary"
            size="sm"
            disabled={commissionSaving || commissionLoading}
          >
            {commissionSaving ? "Saving…" : "Save"}
          </Button>
        }
      >
        <Form id="sales-commission-form-shared" onSubmit={handleCommissionSubmit} className="flex flex-col gap-4 !space-y-0">
          <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
            <Select
              label="Sales person"
              options={salesPersonOptions}
              value={commissionForm.salesPersonId}
              onChange={handleCommissionSalesPersonChange}
              placeholder="Select sales person"
              searchable
              className="sm:col-span-2"
              disabled={commissionLoading}
            />
            <Input label="Job#" value={commissionForm.jobNumber} readOnly className="sm:col-span-1" />
            <Input
              label="Amount"
              type="number"
              step="0.01"
              min="0"
              value={commissionForm.amount}
              onChange={(e) => setCommissionForm((prev) => ({ ...prev, amount: e.target.value }))}
              placeholder="0.00"
              required
              disabled={commissionLoading}
            />
          </div>

          <div className="mt-2">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary">Linked commission records</h3>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-card">
                  <tr>
                    <th className="w-16 px-2 py-2 text-left font-medium text-title">Action</th>
                    <th className="px-3 py-2 text-left font-medium text-title">Sales person</th>
                    <th className="px-3 py-2 text-right font-medium text-title">Amount</th>
                    <th className="px-3 py-2 text-left font-medium text-title">Status</th>
                    <th className="px-3 py-2 text-left font-medium text-title">Paid date</th>
                    <th className="px-3 py-2 text-left font-medium text-title">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {commissionLoading ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-secondary">
                        Loading…
                      </td>
                    </tr>
                  ) : commissionRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-secondary">
                        No commission records yet. Add a new entry above.
                      </td>
                    </tr>
                  ) : (
                    commissionRows.map((row) => {
                      const isPaid = row.status === "paid";
                      const isSavingRow = commissionStatusSavingId === row.id;
                      return (
                        <tr key={row.id} className="border-b border-border last:border-b-0">
                          <td className="px-2 py-2">
                            {!isPaid ? (
                              <button
                                type="button"
                                onClick={() => handleCommissionMarkPaid(row.id)}
                                disabled={isSavingRow}
                                className="rounded p-1.5 text-success hover:bg-success/10 focus:outline-none focus:ring-2 focus:ring-success disabled:opacity-50"
                                aria-label="Mark paid"
                                title="Mark paid"
                              >
                                {isSavingRow ? (
                                  <FiRotateCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <FiCheck className="h-4 w-4" />
                                )}
                              </button>
                            ) : (
                              <span className="px-1.5 text-secondary">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-title">
                            {row.salesPersonName || salesPersonNameMap[row.salesPersonId] || "—"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-title">{fmt(row.amount || 0)}</td>
                          <td className="px-3 py-2">
                            <Badge variant={isPaid ? "success" : "warning"} className="rounded-full px-2.5 py-0.5 text-xs">
                              {isPaid ? "Paid" : "Unpaid"}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-title">
                            {row.paidAt ? new Date(row.paidAt).toLocaleDateString() : "—"}
                          </td>
                          <td className="px-3 py-2 text-secondary">
                            {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Form>
      </Modal>

      <Modal
        open={quickSalesPersonModalOpen}
        onClose={() => setQuickSalesPersonModalOpen(false)}
        title="Add Sales Person"
        size="xl"
        zIndex={120}
        actions={
          <Button
            type="submit"
            form="quick-sales-person-form-shared"
            variant="primary"
            size="sm"
            disabled={quickSalesPersonSaving}
          >
            {quickSalesPersonSaving ? "Saving…" : "Save"}
          </Button>
        }
      >
        <Form
          id="quick-sales-person-form-shared"
          onSubmit={handleQuickSalesPersonSubmit}
          className="flex flex-col gap-4 !space-y-0"
        >
          <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-3">
            <Input
              label="Name"
              name="name"
              value={quickSalesPersonForm.name}
              onChange={(e) => setQuickSalesPersonForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Full name"
              required
            />
            <Input
              label="Phone"
              name="phone"
              value={quickSalesPersonForm.phone}
              onChange={(e) => setQuickSalesPersonForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="Phone number"
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={quickSalesPersonForm.email}
              onChange={(e) => setQuickSalesPersonForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Email address"
            />
            <Textarea
              label="Bank Detail"
              name="bankDetail"
              value={quickSalesPersonForm.bankDetail}
              onChange={(e) => setQuickSalesPersonForm((prev) => ({ ...prev, bankDetail: e.target.value }))}
              placeholder="Bank account / payout detail"
              rows={4}
              className="sm:col-span-3"
            />
          </div>
        </Form>
      </Modal>
    </>
  );
}
