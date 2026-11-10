"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import { Form, FORM_SECTIONS_STACK_CLASS } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import CustomerEditFormFields from "@/components/dashboard/customer-edit-form-fields";
import {
  buildCustomerPayload,
  customerApiToForm,
  INITIAL_CUSTOMER_FORM,
} from "@/lib/customer-record-form";

const FORM_ID = "customer-form-modal-edit";

export default function CustomerFormModal({
  open,
  customerId,
  onClose,
  onAfterSave,
  zIndex = 135,
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(INITIAL_CUSTOMER_FORM);
  const formRef = useRef(form);
  formRef.current = form;

  const load = useCallback(async () => {
    const id = String(customerId || "").trim();
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/customers/${id}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load customer");
      setForm(customerApiToForm(data));
    } catch (e) {
      toast.error(e.message || "Failed to load customer");
      onClose?.();
    } finally {
      setLoading(false);
    }
  }, [customerId, toast, onClose]);

  useEffect(() => {
    if (!open) {
      setForm(INITIAL_CUSTOMER_FORM);
      setLoading(false);
      return;
    }
    const id = String(customerId || "").trim();
    if (!id) {
      onClose?.();
      return;
    }
    load();
  }, [open, customerId, load, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const id = String(customerId || "").trim();
    const current = formRef.current;
    if (!id || !current.companyName?.trim()) {
      toast.error("Company name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/dashboard/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildCustomerPayload(current)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update customer");
      toast.success("Customer updated.");
      onAfterSave?.(data);
      onClose?.();
    } catch (err) {
      toast.error(err.message || "Failed to update customer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit customer"
      size="4xl"
      width="min(1200px, 96vw)"
      showClose={!saving}
      zIndex={zIndex}
      actions={
        <Button type="submit" form={FORM_ID} variant="primary" size="sm" disabled={saving || loading}>
          {saving ? "Saving…" : "Save"}
        </Button>
      }
    >
      {loading ? (
        <p className="py-8 text-center text-secondary">Loading…</p>
      ) : (
        <Form
          id={FORM_ID}
          onSubmit={handleSubmit}
          className={`${FORM_SECTIONS_STACK_CLASS} !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none`}
        >
          <CustomerEditFormFields form={form} setForm={setForm} />
        </Form>
      )}
    </Modal>
  );
}
