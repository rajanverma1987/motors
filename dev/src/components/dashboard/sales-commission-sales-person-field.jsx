"use client";

import { useState } from "react";
import { FiUserPlus } from "react-icons/fi";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import { Form } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";

const SALES_PERSON_INITIAL = {
  name: "",
  phone: "",
  email: "",
  bankDetail: "",
};

/**
 * Sales person dropdown with "Add Sales Person" on the same row (Add New Commission form).
 */
export default function SalesCommissionSalesPersonField({
  salesPersons,
  onSalesPersonsChange,
  value,
  onChange,
  disabled = false,
  required = true,
  quickAddZIndex = 140,
}) {
  const toast = useToast();
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickForm, setQuickForm] = useState(SALES_PERSON_INITIAL);
  const [quickSaving, setQuickSaving] = useState(false);

  const options = salesPersons.map((sp) => ({
    value: sp.id,
    label: sp.name || sp.email || sp.phone || sp.id || "—",
  }));

  const handleQuickSubmit = async (e) => {
    e.preventDefault();
    setQuickSaving(true);
    try {
      const res = await fetch("/api/dashboard/sales-persons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(quickForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create sales person");
      const created = data.salesPerson;
      onSalesPersonsChange?.([created, ...salesPersons]);
      onChange?.(created?.id || "");
      setQuickOpen(false);
      setQuickForm(SALES_PERSON_INITIAL);
      toast.success("Sales person added.");
    } catch (err) {
      toast.error(err.message || "Failed to create sales person");
    } finally {
      setQuickSaving(false);
    }
  };

  return (
    <>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end">
        <Select
          label="Sales Person"
          options={options}
          value={value}
          onChange={(e) => onChange?.(e.target.value ?? "")}
          placeholder="Select sales person"
          searchable
          required={required}
          disabled={disabled}
          className="min-w-0 flex-1"
        />
        <Button
          type="button"
          variant="primary"
          size="sm"
          className="h-10 shrink-0 whitespace-nowrap"
          disabled={disabled}
          onClick={() => {
            setQuickForm(SALES_PERSON_INITIAL);
            setQuickOpen(true);
          }}
        >
          <FiUserPlus className="h-4 w-4 shrink-0" aria-hidden />
          Add Sales Person
        </Button>
      </div>

      <Modal
        open={quickOpen}
        onClose={() => {
          if (quickSaving) return;
          setQuickOpen(false);
        }}
        title="Add Sales Person"
        size="xl"
        zIndex={quickAddZIndex}
        actions={
          <Button
            type="submit"
            form="sales-commission-quick-sales-person-form"
            variant="primary"
            size="sm"
            disabled={quickSaving}
          >
            {quickSaving ? "Saving…" : "Save"}
          </Button>
        }
      >
        <Form
          id="sales-commission-quick-sales-person-form"
          onSubmit={handleQuickSubmit}
          className="flex flex-col gap-4 !space-y-0"
        >
          <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-3">
            <Input
              label="Name"
              name="name"
              value={quickForm.name}
              onChange={(e) => setQuickForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Full name"
              required
            />
            <Input
              label="Phone"
              name="phone"
              value={quickForm.phone}
              onChange={(e) => setQuickForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="Phone number"
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={quickForm.email}
              onChange={(e) => setQuickForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="Email address"
            />
            <Textarea
              label="Bank Detail"
              name="bankDetail"
              value={quickForm.bankDetail}
              onChange={(e) => setQuickForm((prev) => ({ ...prev, bankDetail: e.target.value }))}
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
