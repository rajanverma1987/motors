"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { FiClipboard, FiSave } from "react-icons/fi";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import Select from "@/components/ui/select";
import DataTable from "@/components/ui/data-table";
import { Form, FormSection, FORM_SECTIONS_STACK_CLASS } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useFormatMoney, useUserSettings } from "@/contexts/user-settings-context";
import { mergeUserSettings } from "@/lib/user-settings";
import { quoteStatusSelectOptionsFromMerged } from "@/lib/dropdown-catalog";
import QuoteInventoryPartsControls from "@/components/dashboard/quote-inventory-parts-controls";
import QuoteFormRepairJobInspections from "@/components/dashboard/quote-form-repair-job-inspections";
import QuoteFormCustomerMotorCards from "@/components/dashboard/quote-form-customer-motor-cards";
import WorkOrderFormModal from "@/components/dashboard/work-order-form-modal";
import { scopeAndPartsToFlowLineItems } from "@/lib/repair-flow-quote-form-map";
import { computeTotalsFromLaborAndParts } from "@/lib/quote-invoice-totals";
import {
  WRITE_UP_QUOTE_STATUS,
  INSPECTION_DONE_QUOTE_STATUS,
  isWriteUpStatus,
  jobNumberFieldLabel,
} from "@/lib/quote-rfq-lifecycle";
import RfqPreInspectionSection from "@/components/dashboard/rfq-pre-inspection-section";
import { fetchAllPaginatedDashboardItems } from "@/lib/fetch-all-paginated-dashboard-items";
import {
  ADD_MOTOR_INITIAL,
  MOTOR_TYPE_OPTIONS,
  PARTS_COLUMNS,
  SCOPE_COLUMNS,
  buildAddMotorPayload,
  buildQuotePayload,
  quoteApiToForm,
  sumLinePrices,
  sumPartsLineTotals,
} from "@/lib/quote-form-shared";
import { buildTechnicianSelectOptions } from "@/lib/technician-select-options";

const FORM_ID = "quote-form-modal-edit-form";
const ADD_MOTOR_FORM_ID = "quote-form-modal-add-motor-form";

/**
 * Full RFQ edit form in a modal (same fields as RFQ list page edit modal).
 */
export default function QuoteFormModal({
  open,
  quoteId,
  onClose,
  onAfterSave,
  zIndex = 120,
}) {
  const toast = useToast();
  const fmt = useFormatMoney();
  const { settings } = useUserSettings();
  const mergedSettings = useMemo(() => mergeUserSettings(settings), [settings]);

  const [loading, setLoading] = useState(false);
  const [savingQuote, setSavingQuote] = useState(false);
  const [viewingQuote, setViewingQuote] = useState(null);
  const [form, _setForm] = useState(null);
  const formRef = useRef(form);
  const technicianEmployeeIdRef = useRef("");
  const setForm = useCallback((update) => {
    if (typeof update === "function") {
      _setForm((prev) => {
        const next = update(prev);
        formRef.current = next;
        return next;
      });
    } else {
      formRef.current = update;
      _setForm(update);
    }
  }, []);

  const handleTechnicianChange = useCallback(
    (e) => {
      const v = String(e.target?.value ?? "").trim();
      technicianEmployeeIdRef.current = v;
      setForm((f) => (f ? { ...f, technicianEmployeeId: v } : f));
    },
    [setForm]
  );

  const [customers, setCustomers] = useState([]);
  const customersRef = useRef(customers);
  customersRef.current = customers;
  const [motors, setMotors] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [referenceDataLoaded, setReferenceDataLoaded] = useState(false);

  const [addMotorModalOpen, setAddMotorModalOpen] = useState(false);
  const [addMotorForm, setAddMotorForm] = useState(ADD_MOTOR_INITIAL);
  const [savingMotor, setSavingMotor] = useState(false);
  const [workOrderModal, setWorkOrderModal] = useState(null);

  const statusSelectOptions = useMemo(
    () => quoteStatusSelectOptionsFromMerged(mergedSettings),
    [mergedSettings]
  );
  const statusOptionsForForm = useMemo(() => {
    const base = [...statusSelectOptions];
    if (!base.some((o) => o.value === WRITE_UP_QUOTE_STATUS)) {
      base.unshift({ value: WRITE_UP_QUOTE_STATUS, label: "Write-Up" });
    }
    if (!base.some((o) => o.value === INSPECTION_DONE_QUOTE_STATUS)) {
      const writeUpIdx = base.findIndex((o) => o.value === WRITE_UP_QUOTE_STATUS);
      const insertAt = writeUpIdx >= 0 ? writeUpIdx + 1 : 0;
      base.splice(insertAt, 0, {
        value: INSPECTION_DONE_QUOTE_STATUS,
        label: "Inspection done",
      });
    }
    return base;
  }, [statusSelectOptions]);

  const loadCustomers = useCallback(async () => {
    try {
      const list = await fetchAllPaginatedDashboardItems("/api/dashboard/customers");
      setCustomers(list);
    } catch {
      setCustomers([]);
    }
  }, []);

  const loadMotors = useCallback(async () => {
    try {
      const list = await fetchAllPaginatedDashboardItems("/api/dashboard/motors");
      setMotors(list);
    } catch {
      setMotors([]);
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    try {
      const list = await fetchAllPaginatedDashboardItems("/api/dashboard/employees");
      setEmployees(list);
    } catch {
      setEmployees([]);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setReferenceDataLoaded(false);
      await Promise.all([loadCustomers(), loadMotors(), loadEmployees()]);
      if (!cancelled) setReferenceDataLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, loadCustomers, loadMotors, loadEmployees]);

  const loadQuote = useCallback(
    async (id) => {
      const qid = String(id || "").trim();
      if (!qid) return;
      setLoading(true);
      setViewingQuote(null);
      setForm(null);
      try {
        const res = await fetch(`/api/dashboard/quotes/${qid}`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to load RFQ");
        setViewingQuote(data);
        const nextForm = quoteApiToForm(data, customersRef.current);
        technicianEmployeeIdRef.current = String(nextForm.technicianEmployeeId ?? "").trim();
        setForm(nextForm);
      } catch (e) {
        toast.error(e.message || "Failed to load RFQ");
        onClose?.();
      } finally {
        setLoading(false);
      }
    },
    [toast, onClose]
  );

  useEffect(() => {
    if (!open) {
      setViewingQuote(null);
      setForm(null);
      setLoading(false);
      return;
    }
    const qid = String(quoteId || "").trim();
    if (!qid) {
      onClose?.();
      return;
    }
    if (!referenceDataLoaded) return;
    loadQuote(qid);
  }, [open, quoteId, referenceDataLoaded, loadQuote, onClose]);

  const handleClose = useCallback(() => {
    if (savingQuote) return;
    onClose?.();
  }, [onClose, savingQuote]);

  const refreshQuoteWorkOrderLink = useCallback(async (qid) => {
    const id = String(qid || "").trim();
    if (!id) return;
    try {
      const res = await fetch(`/api/dashboard/quotes/${id}`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      const woId = data.workOrderId ?? "";
      setViewingQuote((prev) => (String(prev?.id || "") === id ? { ...prev, workOrderId: woId } : prev));
      setForm((f) => (f && String(f.quoteId || "") === id ? { ...f, workOrderId: woId } : f));
    } catch {
      /* keep current */
    }
  }, []);

  const editFormJobIdLabel = useMemo(
    () => jobNumberFieldLabel(form?.workOrderId),
    [form?.workOrderId]
  );

  const customerOptions = useMemo(
    () =>
      [{ value: "", label: "Select customer…" }].concat(
        customers.map((c) => ({ value: c.id, label: c.companyName || c.id || "—" }))
      ),
    [customers]
  );

  const motorOptionsForCustomer = useMemo(() => {
    const custId = form?.customerId || formRef.current?.customerId;
    if (!custId) return [{ value: "", label: "Select customer first" }];
    const linked = motors
      .filter((m) => m.customerId === custId)
      .map((m) => ({
        value: m.id,
        label: [m.serialNumber, m.manufacturer, m.model].filter(Boolean).join(" · ") || m.id,
      }));
    return [
      { value: "", label: "Select motor…" },
      ...linked,
      { value: "__add_motor__", label: "+ Add new motor (linked to this customer)" },
    ];
  }, [motors, form?.customerId]);

  const technicianOptions = useMemo(
    () => buildTechnicianSelectOptions(employees),
    [employees]
  );

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === form?.customerId) || null,
    [customers, form?.customerId]
  );
  const selectedMotor = useMemo(
    () => motors.find((m) => m.id === form?.motorId) || null,
    [motors, form?.motorId]
  );

  const scopeTotal = useMemo(() => sumLinePrices(form?.scopeLines), [form?.scopeLines]);
  const partsTotalSum = useMemo(() => sumPartsLineTotals(form?.partsLines), [form?.partsLines]);
  const serviceProposalTotal = scopeTotal + partsTotalSum;
  const selectedCustomerTaxExempt = selectedCustomer?.taxExempt !== false;
  const selectedCustomerTaxPercent = selectedCustomerTaxExempt
    ? "0"
    : String(selectedCustomer?.taxPercent ?? "0");
  const formTotals = computeTotalsFromLaborAndParts({
    laborTotal: scopeTotal,
    partsTotal: partsTotalSum,
    taxExempt: selectedCustomerTaxExempt,
    taxPercent: selectedCustomerTaxPercent,
  });

  const openAddMotorModal = () => {
    const custId = form?.customerId || formRef.current?.customerId;
    if (!custId) return;
    setAddMotorForm({ ...ADD_MOTOR_INITIAL, customerId: custId });
    setAddMotorModalOpen(true);
  };

  const handleMotorSelectChange = (e) => {
    const val = e.target?.value ?? "";
    if (val === "__add_motor__") {
      openAddMotorModal();
      return;
    }
    setForm((f) => ({ ...f, motorId: val }));
  };

  const handleAddMotorSubmit = async (e) => {
    e.preventDefault();
    const custId = addMotorForm.customerId?.trim();
    if (!custId) {
      toast.error("Customer is required.");
      return;
    }
    setSavingMotor(true);
    try {
      const res = await fetch("/api/dashboard/motors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(buildAddMotorPayload(addMotorForm)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create motor");
      toast.success("Motor added and linked to customer.");
      await loadMotors();
      setForm((f) => ({ ...f, motorId: data.motor?.id ?? data.id ?? "" }));
      setAddMotorModalOpen(false);
    } catch (err) {
      toast.error(err.message || "Failed to add motor");
    } finally {
      setSavingMotor(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const technicianEmployeeId = String(
      technicianEmployeeIdRef.current ||
        formRef.current?.technicianEmployeeId ||
        form?.technicianEmployeeId ||
        ""
    ).trim();
    const currentForm = formRef.current
      ? { ...formRef.current, technicianEmployeeId }
      : null;
    if (!currentForm || !viewingQuote?.id) return;
    if (!currentForm.customerId?.trim()) {
      toast.error("Customer is required.");
      return;
    }
    if (!currentForm.motorId?.trim()) {
      toast.error("Motor is required.");
      return;
    }
    const lineItems = scopeAndPartsToFlowLineItems(currentForm.scopeLines, currentForm.partsLines);
    if (!lineItems.length) {
      toast.error("Add at least one scope line or other cost line.");
      return;
    }
    setSavingQuote(true);
    try {
      const payload = buildQuotePayload(currentForm);
      const res = await fetch(`/api/dashboard/quotes/${viewingQuote.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update quote");
      const savedTechId = String(data.quote?.technicianEmployeeId ?? "").trim();
      technicianEmployeeIdRef.current = savedTechId;
      toast.success("Quote updated.");
      setViewingQuote(data.quote);
      onAfterSave?.();
      onClose?.();
    } catch (err) {
      toast.error(err.message || "Failed to update quote");
    } finally {
      setSavingQuote(false);
    }
  };

  const showForm = open && form && !loading;

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        title="Edit quote"
        size="full"
        width="min(1200px, 94vw)"
        showClose={!savingQuote}
        headerClassName="flex-wrap"
        zIndex={zIndex}
        actions={
          showForm ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={savingQuote || !String(viewingQuote?.workOrderId || "").trim()}
                className="inline-flex shrink-0 items-center gap-1.5"
                title={
                  String(viewingQuote?.workOrderId || "").trim()
                    ? "Open work order for this quote"
                    : "Create a work order from the RFQ page first"
                }
                onClick={() => {
                  const wid = String(viewingQuote?.workOrderId || "").trim();
                  if (!wid) return;
                  setWorkOrderModal({ workOrderId: wid });
                }}
              >
                <FiClipboard className="h-4 w-4 shrink-0" aria-hidden />
                View Job
              </Button>
              <Button
                type="submit"
                form={FORM_ID}
                variant="primary"
                size="sm"
                disabled={savingQuote}
                className="inline-flex shrink-0 items-center gap-1.5"
              >
                {savingQuote ? (
                  "Saving…"
                ) : (
                  <>
                    <FiSave className="h-4 w-4 shrink-0" aria-hidden />
                    Save
                  </>
                )}
              </Button>
            </>
          ) : null
        }
      >
        {loading || !form ? (
          <div className="flex items-center justify-center py-12">
            <span className="text-secondary">Loading RFQ…</span>
          </div>
        ) : (
          <Form id={FORM_ID} onSubmit={handleEditSubmit} className={`${FORM_SECTIONS_STACK_CLASS} !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none`}>
            <input
              type="hidden"
              name="technicianEmployeeId"
              value={form.technicianEmployeeId || ""}
              readOnly
              aria-hidden
            />
            <FormSection title="Quote info">
              <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
                <Input label={editFormJobIdLabel} value={form.rfqNumber || "—"} readOnly />
                <Input
                  label="Customer PO#"
                  value={form.customerPo}
                  onChange={(e) => setForm((f) => ({ ...f, customerPo: e.target.value }))}
                  placeholder="Customer PO number"
                />
                <Input
                  label="Date"
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
                <Select
                  label="Technician"
                  options={technicianOptions}
                  value={form.technicianEmployeeId}
                  onChange={handleTechnicianChange}
                  placeholder="Select technician"
                  searchable
                />
                {isWriteUpStatus(form?.status) ? (
                  <p className="sm:col-span-2 lg:col-span-4 text-xs text-secondary">
                    Assign a technician so the RFQ appears on the mobile app as a pre-inspection assignment. Work
                    orders are not created automatically — use Create work order on the RFQ list when the quote is
                    approved.
                  </p>
                ) : null}
                <Select
                  label="Status"
                  options={statusOptionsForForm}
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value ?? "draft" }))}
                  placeholder="Status"
                  searchable={false}
                />
                <Input
                  label="Estimated completion"
                  value={form.estimatedCompletion}
                  onChange={(e) => setForm((f) => ({ ...f, estimatedCompletion: e.target.value }))}
                  placeholder="e.g. 2 weeks"
                />
              </div>
            </FormSection>
            <FormSection title="Customer & motor">
              <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
                <Select
                  label="Customer"
                  options={customerOptions}
                  value={form.customerId}
                  onChange={(e) => {
                    const newCustomerId = e.target.value ?? "";
                    const currentMotor = motors.find((m) => m.id === form.motorId);
                    const keepMotor = currentMotor && currentMotor.customerId === newCustomerId;
                    const nextCustomer = customers.find((c) => c.id === newCustomerId);
                    setForm((f) => ({
                      ...f,
                      customerId: newCustomerId,
                      motorId: keepMotor ? f.motorId : "",
                      customerTaxExempt: nextCustomer?.taxExempt !== false,
                      customerTaxPercent:
                        nextCustomer?.taxExempt === false ? String(nextCustomer?.taxPercent ?? "0") : "0",
                    }));
                  }}
                  placeholder="Select customer"
                  searchable
                  className="lg:col-span-2 min-w-0"
                />
                <Select
                  label="Motor"
                  options={motorOptionsForCustomer}
                  value={form.motorId === "__add_motor__" ? "" : form.motorId}
                  onChange={handleMotorSelectChange}
                  placeholder={form.customerId ? "Select motor…" : "Select customer first"}
                  searchable
                  className="lg:col-span-2 min-w-0"
                  disabled={!form.customerId}
                />
              </div>
              <QuoteFormCustomerMotorCards
                customer={selectedCustomer}
                motor={selectedMotor}
                quickViewZIndex={zIndex + 10}
                onCustomerSaved={async (saved) => {
                  await loadCustomers();
                  const sid = String(saved?.id ?? "").trim();
                  if (sid && String(form?.customerId ?? "") === sid) {
                    setForm((f) => ({
                      ...f,
                      customerTaxExempt: saved.taxExempt !== false,
                      customerTaxPercent:
                        saved.taxExempt === false ? String(saved.taxPercent ?? "0") : "0",
                    }));
                  }
                }}
                onMotorSaved={() => loadMotors()}
              />
            </FormSection>
            {isWriteUpStatus(form?.status) && viewingQuote?.id ? (
              <RfqPreInspectionSection
                quoteId={viewingQuote.id}
                quoteStatus={form.status}
                disabled={savingQuote}
                onStatusChange={(status) => {
                  setForm((f) => ({ ...f, status }));
                  setViewingQuote((v) => (v ? { ...v, status } : v));
                }}
              />
            ) : (
              <QuoteFormRepairJobInspections
                workOrderId={form.workOrderId}
                quoteMotorId={form.motorId}
                disabled={savingQuote}
              />
            )}
            <FormSection title="Scope & other cost">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
                <div className="lg:col-span-2">
                  <div className="mb-1 text-xs font-medium text-secondary">Scope with price</div>
                  <DataTable
                    columns={SCOPE_COLUMNS}
                    data={form.scopeLines}
                    onChange={(rows) => setForm((f) => ({ ...f, scopeLines: rows }))}
                    striped
                  />
                </div>
                <div className="lg:col-span-3">
                  <div className="mb-1 text-xs font-medium text-secondary">
                    Other Cost (item, Qty, UOM, price)
                  </div>
                  <QuoteInventoryPartsControls
                    partsLines={form.partsLines}
                    onChangePartsLines={(rows) => setForm((f) => ({ ...f, partsLines: rows }))}
                    quoteId={viewingQuote?.id ?? null}
                    fmtPrice={fmt}
                  />
                  <DataTable
                    columns={PARTS_COLUMNS}
                    data={form.partsLines}
                    onChange={(rows) => setForm((f) => ({ ...f, partsLines: rows }))}
                    striped
                  />
                </div>
              </div>
              <div className="mt-3 rounded-lg border border-border">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-border">
                      <td className="px-3 py-2 text-secondary">Scope total</td>
                      <td className="px-3 py-2 text-right text-title">{fmt(scopeTotal)}</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="px-3 py-2 text-secondary">Other Cost total</td>
                      <td className="px-3 py-2 text-right text-title">{fmt(partsTotalSum)}</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="px-3 py-2 text-secondary">Service proposal total</td>
                      <td className="px-3 py-2 text-right text-title">{fmt(serviceProposalTotal)}</td>
                    </tr>
                    <tr className="border-b border-border">
                      <td className="px-3 py-2 text-secondary">Tax</td>
                      <td className="px-3 py-2 text-right text-title">{fmt(formTotals.taxAmount)}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-semibold text-title">Grand total</td>
                      <td className="px-3 py-2 text-right font-semibold text-title">
                        {fmt(formTotals.grandTotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </FormSection>
            <FormSection title="Notes">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Textarea
                  id="quote-form-modal-internal-notes"
                  name="internalNotes"
                  label="Internal notes"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={4}
                  placeholder="Terms, technician notes, and caveats…"
                  textareaClassName="min-h-[7.5rem] w-full min-w-0"
                />
                <Textarea
                  id="quote-form-modal-customer-notes"
                  name="customerNotes"
                  label="Customer notes"
                  value={form.customerNotes}
                  onChange={(e) => setForm((f) => ({ ...f, customerNotes: e.target.value }))}
                  rows={4}
                  placeholder="Shown on the proposal and documents sent to the customer…"
                  textareaClassName="min-h-[7.5rem] w-full min-w-0"
                />
              </div>
            </FormSection>
          </Form>
        )}
      </Modal>

      <Modal
        open={addMotorModalOpen}
        onClose={() => setAddMotorModalOpen(false)}
        title="Add new motor"
        size="4xl"
        zIndex={zIndex + 10}
        actions={
          <Button
            type="submit"
            form={ADD_MOTOR_FORM_ID}
            variant="primary"
            size="sm"
            disabled={savingMotor}
          >
            {savingMotor ? "Saving…" : "Save"}
          </Button>
        }
      >
        <Form id={ADD_MOTOR_FORM_ID} onSubmit={handleAddMotorSubmit} className={`${FORM_SECTIONS_STACK_CLASS} !space-y-0 !border-0 !bg-transparent !p-0 !shadow-none`}>
          <FormSection
            title="Customer & identification"
            subtitle={`Linked to: ${selectedCustomer?.companyName || "—"}`}
          >
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Serial number"
                value={addMotorForm.serialNumber}
                onChange={(e) => setAddMotorForm((f) => ({ ...f, serialNumber: e.target.value }))}
                placeholder="Serial number"
              />
            </div>
          </FormSection>
          <FormSection title="Motor details">
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
              <Input
                label="Manufacturer"
                value={addMotorForm.manufacturer}
                onChange={(e) => setAddMotorForm((f) => ({ ...f, manufacturer: e.target.value }))}
                placeholder="Manufacturer"
              />
              <Input
                label="Model"
                value={addMotorForm.model}
                onChange={(e) => setAddMotorForm((f) => ({ ...f, model: e.target.value }))}
                placeholder="Model"
              />
              <Select
                label="Motor type"
                options={MOTOR_TYPE_OPTIONS}
                value={addMotorForm.motorType}
                onChange={(e) => setAddMotorForm((f) => ({ ...f, motorType: e.target.value ?? "" }))}
                placeholder="Select type"
              />
              <Input
                label="HP"
                value={addMotorForm.hp}
                onChange={(e) => setAddMotorForm((f) => ({ ...f, hp: e.target.value }))}
                placeholder="e.g. 50"
              />
              <Input
                label="RPM"
                value={addMotorForm.rpm}
                onChange={(e) => setAddMotorForm((f) => ({ ...f, rpm: e.target.value }))}
                placeholder="e.g. 1800"
              />
              <Input
                label="Voltage"
                value={addMotorForm.voltage}
                onChange={(e) => setAddMotorForm((f) => ({ ...f, voltage: e.target.value }))}
                placeholder="e.g. 480V"
              />
              <Input
                label="KW"
                value={addMotorForm.kw}
                onChange={(e) => setAddMotorForm((f) => ({ ...f, kw: e.target.value }))}
                placeholder="e.g. 37"
              />
              <Input
                label="AMPs"
                value={addMotorForm.amps}
                onChange={(e) => setAddMotorForm((f) => ({ ...f, amps: e.target.value }))}
                placeholder="e.g. 45"
              />
              <Input
                label="Frame size"
                value={addMotorForm.frameSize}
                onChange={(e) => setAddMotorForm((f) => ({ ...f, frameSize: e.target.value }))}
                placeholder="Frame size"
              />
              <Input
                label="Slots"
                value={addMotorForm.slots}
                onChange={(e) => setAddMotorForm((f) => ({ ...f, slots: e.target.value }))}
                placeholder="Slots"
              />
              <Input
                label="Core length"
                value={addMotorForm.coreLength}
                onChange={(e) => setAddMotorForm((f) => ({ ...f, coreLength: e.target.value }))}
                placeholder="Core length"
              />
              <Input
                label="Core diameter"
                value={addMotorForm.coreDiameter}
                onChange={(e) => setAddMotorForm((f) => ({ ...f, coreDiameter: e.target.value }))}
                placeholder="Core diameter"
              />
              <Input
                label="Bars"
                value={addMotorForm.bars}
                onChange={(e) => setAddMotorForm((f) => ({ ...f, bars: e.target.value }))}
                placeholder="Bars"
              />
            </div>
          </FormSection>
          <FormSection title="Notes">
            <Textarea
              label="Notes"
              value={addMotorForm.notes}
              onChange={(e) => setAddMotorForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Notes, problem description, etc."
              rows={3}
              className="[&_label]:sr-only"
            />
          </FormSection>
        </Form>
      </Modal>

      <WorkOrderFormModal
        open={!!workOrderModal}
        workOrderId={workOrderModal?.workOrderId ?? null}
        onClose={() => setWorkOrderModal(null)}
        onAfterSave={() => {
          const qid = viewingQuote?.id;
          if (qid) refreshQuoteWorkOrderLink(qid);
        }}
        zIndex={zIndex + 5}
      />
    </>
  );
}
