"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FiAlertTriangle,
  FiBell,
  FiCheckCircle,
  FiClock,
  FiExternalLink,
  FiMail,
  FiSend,
} from "react-icons/fi";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import { useAlert } from "@/components/confirm-provider";
import { useAuth } from "@/contexts/auth-context";

export default function SimplePoDueNotificationsModal({
  open,
  onClose,
  data,
  loading = false,
  onRefresh,
  onOpenPo,
}) {
  const alert = useAlert();
  const { isOwner } = useAuth();
  const [sending, setSending] = useState(false);

  if (!open) return null;

  const approaching = Array.isArray(data?.approaching) ? data.approaching : [];
  const overdue = Array.isArray(data?.overdue) ? data.overdue : [];
  const totalCount = overdue.length + approaching.length;
  const smtpReady = Boolean(data?.smtpReady);
  const smtpFromEmail = String(data?.smtpFromEmail || "").trim();
  const recipients = Array.isArray(data?.recipients) ? data.recipients : [];

  const handleSendNotification = async () => {
    if (!smtpReady) {
      await alert({
        title: "SMTP Required",
        message:
          "Shop SMTP must be configured and enabled to send delivery due notifications. Please configure your settings under Settings: Email Settings.",
        variant: "warning",
      });
      return;
    }

    if (totalCount === 0) {
      await alert({
        title: "No Due POs",
        message: "There are no purchase orders currently approaching or past their expected delivery date.",
      });
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/dashboard/simple-purchase-orders/due-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to send notification");
      }

      await alert({
        title: "Notification Sent",
        message:
          result.message ||
          `Notification email sent to ${recipients.join(", ")} for ${totalCount} purchase order(s).`,
      });
      onRefresh?.();
      onClose?.();
    } catch (err) {
      await alert({
        title: "Failed to Send",
        message: err.message || "An error occurred while sending notification email via shop SMTP.",
        variant: "danger",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !sending && onClose?.()}
      title="Purchase Order Due Notifications"
      size="4xl"
      width="min(980px, 96vw)"
      closeOnOutsideClick={false}
      showClose={!sending}
      actions={
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={sending}
          >
            Close
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSendNotification}
            disabled={sending || loading || totalCount === 0 || !smtpReady}
            className="inline-flex items-center gap-1.5"
            title={
              !smtpReady
                ? "Configure shop SMTP in Settings: Email Settings to send notifications"
                : totalCount === 0
                  ? "No due purchase orders to notify"
                  : "Send notification email to purchasing team via shop SMTP"
            }
          >
            <FiSend className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {sending ? "Sending…" : "Send Notification Now"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 text-xs">
        {/* Top Status & Recipient Banner */}
        <div className="grid gap-3 rounded-lg border border-border bg-card p-3 sm:grid-cols-2">
          <div>
            <p className="font-semibold text-title">Shop SMTP Delivery</p>
            {smtpReady ? (
              <div className="mt-1 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <FiCheckCircle className="h-4 w-4 shrink-0" aria-hidden />
                <span>
                  Configured: sending from <strong className="font-semibold">{smtpFromEmail}</strong>
                </span>
              </div>
            ) : (
              <div className="mt-1 flex flex-col gap-1 text-danger">
                <div className="flex items-center gap-1.5 font-medium">
                  <FiAlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                  <span>Shop SMTP is not fully configured or disabled</span>
                </div>
                {isOwner ? (
                  <Link
                    href="/dashboards/settings?section=smtp"
                    className="inline-flex items-center gap-1 text-xs text-primary underline"
                    onClick={onClose}
                  >
                    Configure Shop SMTP in Settings <FiExternalLink className="h-3 w-3" aria-hidden />
                  </Link>
                ) : (
                  <span className="text-xs text-secondary">
                    Please contact the shop administrator to configure email settings.
                  </span>
                )}
              </div>
            )}
          </div>

          <div>
            <p className="font-semibold text-title">Notification Recipients</p>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <FiMail className="h-3.5 w-3.5 text-secondary" aria-hidden />
              {recipients.length > 0 ? (
                recipients.map((em) => (
                  <span
                    key={em}
                    className="inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary"
                  >
                    {em}
                  </span>
                ))
              ) : (
                <span className="text-secondary">Shop account email</span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-secondary">
              Alert window: {data?.daysBefore ?? 2} day(s) before due date.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-secondary">
            <p>Checking purchase order due dates…</p>
          </div>
        ) : totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card py-12 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <FiCheckCircle className="h-5 w-5" aria-hidden />
            </div>
            <p className="font-semibold text-title">All Purchase Orders Are On Schedule</p>
            <p className="max-w-md text-xs text-secondary">
              There are no purchase orders currently approaching or past their expected delivery date. Active line items are fulfilled or scheduled within safe delivery windows.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Overdue Section */}
            {overdue.length > 0 ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="danger" className="rounded-full px-2.5 py-0.5 text-xs font-semibold">
                    Overdue Delivery ({overdue.length})
                  </Badge>
                  <span className="text-secondary">Expected delivery date has passed</span>
                </div>

                <div className="flex flex-col gap-2">
                  {overdue.map((po) => (
                    <div
                      key={po.id}
                      className="rounded-lg border border-danger/30 bg-card p-3 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="font-bold text-primary hover:underline text-sm"
                            onClick={() => {
                              onClose?.();
                              onOpenPo?.(po);
                            }}
                          >
                            PO #{po.poNumber}
                          </button>
                          {po.jobNumber ? (
                            <Badge variant="primary" className="rounded-full px-2 py-0 text-[10px]">
                              Job #{po.jobNumber}
                            </Badge>
                          ) : null}
                          <span className="text-secondary">|</span>
                          <span className="font-medium text-title">{po.vendorName}</span>
                          {po.vendorPhone ? (
                            <span className="text-secondary">Tel: {po.vendorPhone}</span>
                          ) : null}
                          {po.vendorEmail ? (
                            <span className="text-secondary">Email: {po.vendorEmail}</span>
                          ) : null}
                        </div>
                        <div className="text-right">
                          <Badge variant="danger" className="font-bold">
                            {po.daysOverdue} day{po.daysOverdue === 1 ? "" : "s"} overdue
                          </Badge>
                          <p className="text-[11px] text-secondary mt-0.5">Due: {po.dueDate}</p>
                        </div>
                      </div>

                      {po.pendingLines?.length ? (
                        <div className="mt-2 overflow-auto">
                          <table className="w-full text-left text-[11px]">
                            <thead>
                              <tr className="text-secondary border-b border-border">
                                <th className="py-1 font-semibold">Pending Item</th>
                                <th className="py-1 text-right font-semibold">Ordered</th>
                                <th className="py-1 text-right font-semibold">Received</th>
                                <th className="py-1 px-2 font-semibold">Status</th>
                                {po.pendingLines.some((l) => l.vendorInvoiceNumber) ? (
                                  <th className="py-1 font-semibold">Vendor Inv#</th>
                                ) : null}
                              </tr>
                            </thead>
                            <tbody>
                              {po.pendingLines.map((line, idx) => (
                                <tr key={idx} className="border-b border-border/50 text-title">
                                  <td className="py-1">{line.itemName}</td>
                                  <td className="py-1 text-right tabular-nums">
                                    {line.quantity} {line.uom}
                                  </td>
                                  <td className="py-1 text-right tabular-nums">{line.receivedQty}</td>
                                  <td className="py-1 px-2">
                                    <Badge variant="default" className="text-[10px] px-1.5 py-0">
                                      {line.receivingStatus}
                                    </Badge>
                                  </td>
                                  {po.pendingLines.some((l) => l.vendorInvoiceNumber) ? (
                                    <td className="py-1 text-secondary">{line.vendorInvoiceNumber || "-"}</td>
                                  ) : null}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="mt-1 text-[11px] text-secondary italic">
                          No line item breakdown available.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Approaching Due Section */}
            {approaching.length > 0 ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="warning" className="rounded-full px-2.5 py-0.5 text-xs font-semibold">
                    Approaching Due Date ({approaching.length})
                  </Badge>
                  <span className="text-secondary">Expected delivery shortly</span>
                </div>

                <div className="flex flex-col gap-2">
                  {approaching.map((po) => (
                    <div
                      key={po.id}
                      className="rounded-lg border border-warning/40 bg-card p-3 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="font-bold text-primary hover:underline text-sm"
                            onClick={() => {
                              onClose?.();
                              onOpenPo?.(po);
                            }}
                          >
                            PO #{po.poNumber}
                          </button>
                          {po.jobNumber ? (
                            <Badge variant="primary" className="rounded-full px-2 py-0 text-[10px]">
                              Job #{po.jobNumber}
                            </Badge>
                          ) : null}
                          <span className="text-secondary">|</span>
                          <span className="font-medium text-title">{po.vendorName}</span>
                          {po.vendorPhone ? (
                            <span className="text-secondary">Tel: {po.vendorPhone}</span>
                          ) : null}
                          {po.vendorEmail ? (
                            <span className="text-secondary">Email: {po.vendorEmail}</span>
                          ) : null}
                        </div>
                        <div className="text-right">
                          <Badge variant="warning" className="font-bold">
                            {po.daysRemaining === 0
                              ? "Due Today"
                              : `Due in ${po.daysRemaining} day${po.daysRemaining === 1 ? "" : "s"}`}
                          </Badge>
                          <p className="text-[11px] text-secondary mt-0.5">Due: {po.dueDate}</p>
                        </div>
                      </div>

                      {po.pendingLines?.length ? (
                        <div className="mt-2 overflow-auto">
                          <table className="w-full text-left text-[11px]">
                            <thead>
                              <tr className="text-secondary border-b border-border">
                                <th className="py-1 font-semibold">Pending Item</th>
                                <th className="py-1 text-right font-semibold">Ordered</th>
                                <th className="py-1 text-right font-semibold">Received</th>
                                <th className="py-1 px-2 font-semibold">Status</th>
                                {po.pendingLines.some((l) => l.vendorInvoiceNumber) ? (
                                  <th className="py-1 font-semibold">Vendor Inv#</th>
                                ) : null}
                              </tr>
                            </thead>
                            <tbody>
                              {po.pendingLines.map((line, idx) => (
                                <tr key={idx} className="border-b border-border/50 text-title">
                                  <td className="py-1">{line.itemName}</td>
                                  <td className="py-1 text-right tabular-nums">
                                    {line.quantity} {line.uom}
                                  </td>
                                  <td className="py-1 text-right tabular-nums">{line.receivedQty}</td>
                                  <td className="py-1 px-2">
                                    <Badge variant="default" className="text-[10px] px-1.5 py-0">
                                      {line.receivingStatus}
                                    </Badge>
                                  </td>
                                  {po.pendingLines.some((l) => l.vendorInvoiceNumber) ? (
                                    <td className="py-1 text-secondary">{line.vendorInvoiceNumber || "-"}</td>
                                  ) : null}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="mt-1 text-[11px] text-secondary italic">
                          No line item breakdown available.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </Modal>
  );
}
