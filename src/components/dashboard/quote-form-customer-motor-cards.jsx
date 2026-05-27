"use client";

import { useState } from "react";
import { FiEdit2, FiEye } from "react-icons/fi";
import CustomerQuickViewModal from "@/components/dashboard/customer-quick-view-modal";
import CustomerFormModal from "@/components/dashboard/customer-form-modal";
import MotorQuickViewModal from "@/components/dashboard/motor-quick-view-modal";
import MotorFormModal from "@/components/dashboard/motor-form-modal";

const ICON_BTN_CLASS =
  "shrink-0 rounded p-1.5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1";

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

  const customerId = String(customer?.id ?? "").trim();
  const motorId = String(motor?.id ?? "").trim();
  const editZIndex = quickViewZIndex + 5;

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

  return (
    <>
      <div className={`mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 ${className}`.trim()}>
        {customer ? (
          <div className="rounded-lg border border-border bg-card p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium text-title">Customer</div>
              {cardActions(customerId, setOpenCustomerId, setEditCustomerId, "View customer", "Edit customer")}
            </div>
            <p className="mt-1 text-title">{customer.companyName || "—"}</p>
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
          </div>
        ) : null}
        {motor ? (
          <div className="rounded-lg border border-border bg-card p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium text-title">Motor</div>
              {cardActions(motorId, setOpenMotorId, setEditMotorId, "View motor", "Edit motor")}
            </div>
            <p className="mt-1 text-title">
              {[motor.serialNumber, motor.manufacturer, motor.model].filter(Boolean).join(" · ") || "—"}
            </p>
            {(motor.hp || motor.voltage || motor.rpm) && (
              <p className="text-secondary">
                {[
                  motor.hp && `${motor.hp} HP`,
                  motor.voltage && `${motor.voltage}V`,
                  motor.rpm && `${motor.rpm} RPM`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            {motor.motorType ? <p className="text-secondary">Type: {motor.motorType}</p> : null}
          </div>
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
