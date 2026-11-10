"use client";

import { useEffect, useState } from "react";
import { FiChevronDown, FiChevronRight, FiEdit2, FiEye } from "react-icons/fi";
import CustomerQuickViewModal from "@/components/dashboard/customer-quick-view-modal";
import CustomerFormModal from "@/components/dashboard/customer-form-modal";
import MotorQuickViewModal from "@/components/dashboard/motor-quick-view-modal";
import MotorFormModal from "@/components/dashboard/motor-form-modal";
import MotorSummaryBlock from "@/components/dashboard/motor-summary-block";
import { motorSummaryFromMotor } from "@/lib/motor-display-lines";

const ICON_BTN_CLASS =
  "shrink-0 rounded p-1.5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1";

function CollapsibleDetailCard({ title, summary, open, onToggle, actions, children }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-1.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded"
          onClick={onToggle}
          aria-expanded={open}
        >
          {open ? (
            <FiChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden />
          ) : (
            <FiChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden />
          )}
          <div className="min-w-0">
            <div className="font-medium text-title">{title}</div>
            {!open && summary ? (
              <p className="mt-0.5 truncate text-xs text-secondary">{summary}</p>
            ) : null}
          </div>
        </button>
        {actions}
      </div>
      {open ? <div className="mt-2 border-t border-border/60 pt-2">{children}</div> : null}
    </div>
  );
}

/**
 * Customer & motor summary cards on the RFQ edit form, with view and edit actions.
 */
export default function QuoteFormCustomerMotorCards({
  customer,
  motor,
  /** Stacking above parent quote modal */
  quickViewZIndex = 130,
  onCustomerSaved,
  onMotorSaved,
  className = "",
}) {
  const [openCustomerId, setOpenCustomerId] = useState(null);
  const [editCustomerId, setEditCustomerId] = useState(null);
  const [openMotorId, setOpenMotorId] = useState(null);
  const [editMotorId, setEditMotorId] = useState(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [motorOpen, setMotorOpen] = useState(false);

  const customerId = String(customer?.id ?? "").trim();
  const motorId = String(motor?.id ?? "").trim();
  const editZIndex = quickViewZIndex + 5;

  useEffect(() => {
    setCustomerOpen(false);
  }, [customerId]);

  useEffect(() => {
    setMotorOpen(false);
  }, [motorId]);

  if (!customer && !motor) return null;

  const cardActions = (viewId, setViewId, setEditId, viewLabel, editLabel) =>
    viewId ? (
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          className={`${ICON_BTN_CLASS} text-primary hover:bg-primary/10`}
          aria-label={viewLabel}
          title={viewLabel}
          onClick={() => setViewId(viewId)}
        >
          <FiEye className="h-4 w-4 shrink-0" aria-hidden />
        </button>
        <button
          type="button"
          className={`${ICON_BTN_CLASS} text-primary hover:bg-primary/10`}
          aria-label={editLabel}
          title={editLabel}
          onClick={() => setEditId(viewId)}
        >
          <FiEdit2 className="h-4 w-4 shrink-0" aria-hidden />
        </button>
      </div>
    ) : null;

  const motorSummary = motor ? motorSummaryFromMotor(motor) : null;

  return (
    <>
      <div className={`mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 ${className}`.trim()}>
        {customer ? (
          <CollapsibleDetailCard
            title="Customer"
            summary={customer.companyName || "—"}
            open={customerOpen}
            onToggle={() => setCustomerOpen((v) => !v)}
            actions={cardActions(customerId, setOpenCustomerId, setEditCustomerId, "View customer", "Edit customer")}
          >
            <p className="text-title">{customer.companyName || "—"}</p>
            {customer.primaryContactName ? (
              <p className="text-secondary">{customer.primaryContactName}</p>
            ) : null}
            {customer.phone ? <p className="text-secondary">{customer.phone}</p> : null}
            {customer.email ? <p className="text-secondary">{customer.email}</p> : null}
            <p className="text-secondary">
              Tax: {customer.taxExempt === false ? `${customer.taxPercent || "0"}%` : "Exempt"}
            </p>
            {(customer.address || customer.city) && (
              <p className="text-secondary">
                {[customer.address, customer.city, customer.state, customer.zipCode]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
          </CollapsibleDetailCard>
        ) : null}
        {motor ? (
          <CollapsibleDetailCard
            title="Motor"
            summary={motorSummary?.identityLine || "—"}
            open={motorOpen}
            onToggle={() => setMotorOpen((v) => !v)}
            actions={cardActions(motorId, setOpenMotorId, setEditMotorId, "View motor", "Edit motor")}
          >
            <MotorSummaryBlock
              identityLine={motorSummary.identityLine}
              specsLine={motorSummary.specsLine}
              motorType={motorSummary.motorType}
              fallback="—"
              titleClassName="sr-only"
              identityClassName="text-title"
              detailClassName="text-secondary"
            />
          </CollapsibleDetailCard>
        ) : null}
      </div>

      <CustomerQuickViewModal
        open={!!openCustomerId}
        customerId={openCustomerId}
        onClose={() => setOpenCustomerId(null)}
        zIndex={quickViewZIndex}
      />
      <CustomerFormModal
        open={!!editCustomerId}
        customerId={editCustomerId}
        onClose={() => setEditCustomerId(null)}
        onAfterSave={(saved) => {
          onCustomerSaved?.(saved);
        }}
        zIndex={editZIndex}
      />
      <MotorQuickViewModal
        open={!!openMotorId}
        motorId={openMotorId}
        customerName={customer?.companyName || ""}
        onClose={() => setOpenMotorId(null)}
        zIndex={quickViewZIndex}
      />
      <MotorFormModal
        open={!!editMotorId}
        motorId={editMotorId}
        onClose={() => setEditMotorId(null)}
        onAfterSave={(saved) => {
          onMotorSaved?.(saved);
        }}
        zIndex={editZIndex}
      />
    </>
  );
}
