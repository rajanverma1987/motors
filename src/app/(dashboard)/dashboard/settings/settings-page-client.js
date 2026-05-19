"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Button from "@/components/ui/button";
import Checkbox from "@/components/ui/checkbox";
import Select from "@/components/ui/select";
import Textarea from "@/components/ui/textarea";
import Input from "@/components/ui/input";
import Tabs from "@/components/ui/tabs";
import { FormContainer, FormSectionTitle } from "@/components/ui/form-layout";
import { useToast } from "@/components/toast-provider";
import { useAuth } from "@/contexts/auth-context";
import { useUserSettings } from "@/contexts/user-settings-context";
import SettingsDataUploadPanel from "@/components/dashboard/settings-data-upload-panel";
import SettingsControlledDropdownsPanel from "@/components/dashboard/settings-controlled-dropdowns-panel";
import {
  USER_SETTINGS_DEFAULTS,
  mergeUserSettings,
} from "@/lib/user-settings";
import { DISPLAY_CURRENCIES } from "@/lib/format-currency";

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10 rows" },
  { value: "25", label: "25 rows" },
  { value: "50", label: "50 rows" },
  { value: "100", label: "100 rows" },
];

const WEEK_START_OPTIONS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
];

const ACCOUNTS_PAYMENT_TERMS_OPTIONS = [
  { value: "on_receipt", label: "Due on receipt" },
  { value: "net15", label: "NET 15" },
  { value: "net30", label: "NET 30" },
  { value: "net45", label: "NET 45" },
  { value: "net60", label: "NET 60" },
];

export default function SettingsPageClient() {
  const toast = useToast();
  const { user } = useAuth();
  const { refresh: refreshContext } = useUserSettings();
  const [activeTab, setActiveTab] = useState("account");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(() => ({ ...USER_SETTINGS_DEFAULTS }));
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef(null);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/dashboard/settings", {
        credentials: "include",
        cache: "no-store",
      });
      const d = await r.json();
      if (r.ok) {
        setDraft(mergeUserSettings(d.settings));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateDraft = (patch) => setDraft((prev) => ({ ...prev, ...patch }));

  async function handlePasswordChange(e) {
    e?.preventDefault?.();
    if (pwNew !== pwConfirm) {
      toast.error("New password and confirmation do not match.");
      return;
    }
    if ((pwNew || "").length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    setPwSaving(true);
    try {
      const r = await fetch("/api/dashboard/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: pwCurrent,
          newPassword: pwNew,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Could not update password.");
      setPwCurrent("");
      setPwNew("");
      setPwConfirm("");
      toast.success("Password updated.");
    } catch (err) {
      toast.error(err.message || "Could not update password.");
    } finally {
      setPwSaving(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const r = await fetch("/api/dashboard/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(draft),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Save failed");
      setDraft(mergeUserSettings(d.settings));
      await refreshContext();
      toast.success("Settings saved.");
    } catch (e) {
      toast.error(e.message || "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/dashboard/settings/logo", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Upload failed");
      setDraft(mergeUserSettings(d.settings));
      await refreshContext();
      toast.success("Logo updated. It appears in the header and on quote/PO emails.");
    } catch (err) {
      toast.error(err.message || "Could not upload logo.");
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleRemoveLogo() {
    setLogoUploading(true);
    try {
      const r = await fetch("/api/dashboard/settings/logo", {
        method: "DELETE",
        credentials: "include",
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Remove failed");
      setDraft(mergeUserSettings(d.settings));
      await refreshContext();
      toast.success("Logo removed.");
    } catch (err) {
      toast.error(err.message || "Could not remove logo.");
    } finally {
      setLogoUploading(false);
    }
  }

  const settingsTabs = useMemo(
    () => [
      {
        id: "account",
        label: "Account",
        children: (
          <div className="flex flex-col gap-8 pb-24">
            <FormContainer>
              <FormSectionTitle as="h2">Account</FormSectionTitle>
              <p className="text-sm text-secondary">
                Signed in as{" "}
                <span className="font-medium text-title">{user?.email ?? "—"}</span>
              </p>
              {user?.shopName && (
                <p className="mt-1 text-sm text-secondary">
                  Shop: <span className="text-title">{user.shopName}</span>
                </p>
              )}
            </FormContainer>
            <FormContainer>
              <FormSectionTitle as="h2">Notifications</FormSectionTitle>
              <p className="mb-4 text-sm text-secondary">
                Control what we email you about. Transactional emails (e.g. password reset) are always sent when needed.
              </p>
              <div className="flex flex-col gap-4">
                <Checkbox
                  name="marketingTips"
                  label="Tips & product updates"
                  help="Occasional ideas to get more from the directory and CRM."
                  checked={!!draft.marketingTips}
                  onChange={(e) => updateDraft({ marketingTips: e.target.checked })}
                />
                <Checkbox
                  name="leadEmailAlerts"
                  label="New lead alerts (coming soon)"
                  help="When enabled, we'll email you when a new lead is assigned or created for your shop."
                  checked={!!draft.leadEmailAlerts}
                  onChange={(e) => updateDraft({ leadEmailAlerts: e.target.checked })}
                />
              </div>
            </FormContainer>
            <FormContainer>
              <FormSectionTitle as="h2">Password</FormSectionTitle>
              <p className="mb-4 text-sm text-secondary">
                If your account was created by our team, you received a temporary password by email—change it here
                after you sign in. This does not affect the sticky <strong className="text-title">Save changes</strong>{" "}
                bar for other settings (save those separately).
              </p>
              <form className="flex max-w-[33.6rem] flex-col gap-4" onSubmit={handlePasswordChange}>
                <Input
                  type="password"
                  label="Current password"
                  name="currentPassword"
                  autoComplete="current-password"
                  value={pwCurrent}
                  onChange={(e) => setPwCurrent(e.target.value)}
                />
                <Input
                  type="password"
                  label="New password"
                  name="newPassword"
                  autoComplete="new-password"
                  value={pwNew}
                  onChange={(e) => setPwNew(e.target.value)}
                />
                <Input
                  type="password"
                  label="Confirm new password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  value={pwConfirm}
                  onChange={(e) => setPwConfirm(e.target.value)}
                />
                <Button type="submit" variant="secondary" disabled={pwSaving}>
                  {pwSaving ? "Updating…" : "Update password"}
                </Button>
              </form>
            </FormContainer>
          </div>
        ),
      },
      {
        id: "accounts",
        label: "Accounts",
        children: (
          <div className="flex flex-col gap-8 pb-24">
            <FormContainer>
              <FormSectionTitle as="h2">Company billing</FormSectionTitle>
              <p className="mb-4 text-sm text-secondary">
                Remittance and billing address for your shop (e.g. for invoices, statements, and accounts
                receivable). Shown on customer-facing documents when you wire this field in templates.
              </p>
              <Textarea
                label="Billing address"
                value={draft.accountsBillingAddress ?? ""}
                onChange={(e) => updateDraft({ accountsBillingAddress: e.target.value })}
                rows={6}
                placeholder={"Your company legal name\nStreet\nCity, ST ZIP\nPhone · AP email"}
              />
            </FormContainer>
            <FormContainer>
              <FormSectionTitle as="h2">Shipping</FormSectionTitle>
              <p className="mb-4 text-sm text-secondary">
                Ship-from or return address (motor pickup, parts shipping, warehouse). Use if different from
                billing.
              </p>
              <Textarea
                label="Shipping address"
                value={draft.accountsShippingAddress ?? ""}
                onChange={(e) => updateDraft({ accountsShippingAddress: e.target.value })}
                rows={6}
                placeholder={"Company name\nDock / receiving\nStreet\nCity, ST ZIP"}
              />
            </FormContainer>
            <FormContainer>
              <FormSectionTitle as="h2">Payment terms (NET 30)</FormSectionTitle>
              <p className="mb-4 text-sm text-secondary">
                Default payment terms for your shop. Use for invoices, quotes, and vendor expectations. You
                can still override per document later when that is supported.
              </p>
              <div className="max-w-[33.6rem]">
                <Select
                  label="Standard terms"
                  options={ACCOUNTS_PAYMENT_TERMS_OPTIONS}
                  value={draft.accountsPaymentTerms || "net30"}
                  onChange={(e) =>
                    updateDraft({
                      accountsPaymentTerms: (e.target.value || "net30").toLowerCase(),
                    })
                  }
                  searchable={false}
                />
              </div>
            </FormContainer>
            <FormContainer>
              <FormSectionTitle as="h2">Payment options (invoice)</FormSectionTitle>
              <p className="mb-4 text-sm text-secondary">
                Bank transfer details, Zelle/Venmo, or a link to pay online (Stripe, PayPal, etc.). Shown at
                the bottom of printed invoices and on the invoice link you email to customers. URLs become
                clickable on the web view.
              </p>
              <Textarea
                label="How to pay"
                value={draft.invoicePaymentOptions ?? ""}
                onChange={(e) => updateDraft({ invoicePaymentOptions: e.target.value })}
                rows={8}
                placeholder={
                  "Bank: Your Shop LLC\nRouting: …\nAccount: …\n\nOr pay online:\nhttps://pay.example.com/invoice"
                }
              />
            </FormContainer>
            <FormContainer>
              <FormSectionTitle as="h2">Thank-you note (invoice)</FormSectionTitle>
              <p className="mb-4 text-sm text-secondary">
                Short closing line at the bottom of the invoice (after payment options). Leave blank to hide.
              </p>
              <Textarea
                label="Thank-you message"
                value={draft.invoiceThankYouNote ?? ""}
                onChange={(e) => updateDraft({ invoiceThankYouNote: e.target.value })}
                rows={2}
                placeholder="Thank you for your business!"
              />
            </FormContainer>
          </div>
        ),
      },
      {
        id: "branding",
        label: "Branding",
        children: (
          <div className="flex flex-col gap-8 pb-24">
            <FormContainer>
              <FormSectionTitle as="h2">Company logo</FormSectionTitle>
              <p className="mb-4 text-sm text-secondary">
                Shown in the dashboard header. Included above your shop name in emails when you send a quote to a customer or a purchase order to a vendor (PNG, JPEG, GIF, or WebP, max 2MB).
              </p>
              <div className="flex flex-wrap items-start gap-6">
                <div className="flex h-20 min-w-[120px] items-center justify-center rounded-lg border border-border bg-form-bg px-4">
                  {draft.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={draft.logoUrl}
                      alt="Your logo"
                      className="max-h-16 max-w-[200px] object-contain"
                    />
                  ) : (
                    <span className="text-sm text-secondary">No logo</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={handleLogoFile}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={logoUploading}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {logoUploading ? "Working…" : draft.logoUrl ? "Replace logo" : "Upload logo"}
                  </Button>
                  {draft.logoUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-danger border-danger/40 hover:bg-danger/10"
                      disabled={logoUploading}
                      onClick={handleRemoveLogo}
                    >
                      Remove logo
                    </Button>
                  )}
                </div>
              </div>
            </FormContainer>
          </div>
        ),
      },
      {
        id: "display",
        label: "Display",
        children: (
          <div className="flex flex-col gap-8 pb-24">
            <FormContainer>
              <FormSectionTitle as="h2">Currency</FormSectionTitle>
              <p className="mb-4 text-sm text-secondary">
                Quotes, purchase orders, and other money fields on the dashboard are shown in this currency. Stored amounts are unchanged; only display formatting updates.
              </p>
              <div className="max-w-[33.6rem]">
                <Select
                  label="Display currency"
                  options={DISPLAY_CURRENCIES}
                  value={draft.currency || "USD"}
                  onChange={(e) =>
                    updateDraft({ currency: (e.target.value || "USD").toUpperCase() })
                  }
                  searchable
                />
              </div>
            </FormContainer>
            <FormContainer>
              <FormSectionTitle as="h2">Lists & tables</FormSectionTitle>
              <p className="mb-4 text-sm text-secondary">
                Default pagination for data tables across the dashboard (customers, quotes, leads, etc.).
              </p>
              <div className="max-w-xs">
                <Select
                  label="Rows per page"
                  options={PAGE_SIZE_OPTIONS}
                  value={String(draft.tablePageSize)}
                  onChange={(e) =>
                    updateDraft({ tablePageSize: Number(e.target.value) || 25 })
                  }
                  searchable={false}
                />
              </div>
              <div className="mt-4">
                <Checkbox
                  name="compactTables"
                  label="Compact table rows (coming soon)"
                  help="Tighter row height on list pages when supported."
                  checked={!!draft.compactTables}
                  onChange={(e) => updateDraft({ compactTables: e.target.checked })}
                />
              </div>
            </FormContainer>
            <FormContainer>
              <FormSectionTitle as="h2">Calendar & dates</FormSectionTitle>
              <div className="max-w-xs">
                <Select
                  label="Week starts on"
                  options={WEEK_START_OPTIONS}
                  value={String(draft.weekStartsOn)}
                  onChange={(e) =>
                    updateDraft({ weekStartsOn: Number(e.target.value) ? 1 : 0 })
                  }
                  searchable={false}
                />
              </div>
            </FormContainer>
            <FormContainer>
              <FormSectionTitle as="h2">Document number prefixes</FormSectionTitle>
              <p className="mb-4 max-w-[42rem] text-sm text-secondary">
                Applied when creating new repair jobs, invoices (from a quote), and work orders. Letters, digits, hyphen,
                and underscore only (max 16 characters). Hyphens are added automatically if you omit one (e.g.{" "}
                <span className="font-mono text-title">ACME</span> becomes <span className="font-mono text-title">ACME-</span>
                ). If a quote RFQ# or work-order segment already starts with your prefix, it is not added again.
              </p>
              <div className="flex max-w-md flex-col gap-4">
                <Input
                  label="Repair job prefix"
                  value={draft.prefixRepairJob ?? ""}
                  onChange={(e) => updateDraft({ prefixRepairJob: e.target.value })}
                  placeholder="RF-"
                  autoComplete="off"
                  maxLength={16}
                />
                <p className="-mt-2 text-xs text-secondary">Leave blank for default RF-00001 style.</p>
                <Input
                  label="Job / RFQ / quote ID prefix"
                  value={draft.prefixInvoice ?? ""}
                  onChange={(e) => updateDraft({ prefixInvoice: e.target.value })}
                  placeholder="CEMR"
                  autoComplete="off"
                  maxLength={16}
                />
                <p className="-mt-2 text-xs text-secondary">
                  Unified job number prefix (e.g. CEMR- + A00001). Same ID on RFQ, quote, then invoices (CEMR-A00001-1) and work orders
                  (W-CEMR-A00001-1).
                </p>
                <Input
                  label="Work order prefix"
                  value={draft.prefixWorkOrder ?? ""}
                  onChange={(e) => updateDraft({ prefixWorkOrder: e.target.value })}
                  placeholder="W-"
                  autoComplete="off"
                  maxLength={16}
                />
                <p className="-mt-2 text-xs text-secondary">Replaces the default W- before the RFQ or job segment (e.g. WO-A00001-1).</p>
              </div>
            </FormContainer>
          </div>
        ),
      },
      {
        id: "dropdowns",
        label: "Dropdowns",
        children: <SettingsControlledDropdownsPanel draft={draft} setDraft={setDraft} />,
      },
      {
        id: "inventory",
        label: "Inventory",
        children: (
          <div className="flex flex-col gap-8 pb-24">
            <FormContainer>
              <FormSectionTitle as="h2">Inventory locations</FormSectionTitle>
              <p className="mb-4 text-sm text-secondary">
                Bin, shelf, or warehouse labels used when editing parts on the master inventory page (dropdown). One
                location per line.
              </p>
              <Textarea
                label="Locations (one per line)"
                value={
                  Array.isArray(draft.inventoryLocations) ? draft.inventoryLocations.join("\n") : ""
                }
                onChange={(e) => {
                  // Keep raw lines while typing: allow newlines (incl. trailing) and spaces; trim/normalize on save via API.
                  const lines = e.target.value.split("\n");
                  updateDraft({ inventoryLocations: lines.slice(0, 50) });
                }}
                rows={10}
                placeholder={"Shelf A1\nBin 12\nReceiving dock"}
              />
            </FormContainer>
          </div>
        ),
      },
      {
        id: "data-upload",
        label: "Data Upload",
        children: <SettingsDataUploadPanel />,
      },
      {
        id: "more",
        label: "More",
        children: (
          <div className="flex flex-col gap-8 pb-24">
            <FormContainer className="border border-dashed border-border bg-card/50">
              <FormSectionTitle as="h2">More settings</FormSectionTitle>
              <p className="text-sm text-secondary">
                Additional preferences (work order defaults, job board, integrations, etc.) can be added here. Check back after updates or ask your administrator.
              </p>
            </FormContainer>
          </div>
        ),
      },
    ],
    [
      draft.accountsBillingAddress,
      draft.accountsShippingAddress,
      draft.accountsPaymentTerms,
      draft.invoicePaymentOptions,
      draft.invoiceThankYouNote,
      draft.compactTables,
      draft.currency,
      draft.leadEmailAlerts,
      draft.logoUrl,
      draft.marketingTips,
      draft.tablePageSize,
      draft.weekStartsOn,
      draft.prefixRepairJob,
      draft.prefixInvoice,
      draft.prefixWorkOrder,
      draft.workOrderStatusTileColors,
      draft.controlledDropdowns,
      draft.inventoryLocations,
      logoUploading,
      user?.email,
      user?.shopName,
      pwCurrent,
      pwNew,
      pwConfirm,
      pwSaving,
    ]
  );

  if (loading) {
    return (
      <div className="w-full min-w-0 py-10">
        <p className="text-secondary">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
      <div className="mb-8 shrink-0 border-b border-border pb-6">
        <h1 className="text-2xl font-bold text-title">Settings</h1>
        <p className="mt-1 text-sm text-secondary">
          Shop defaults, display, billing, and integrations.
        </p>
      </div>

      <Tabs defaultTab="account" value={activeTab} onChange={setActiveTab} tabs={settingsTabs} />

      {activeTab !== "data-upload" ? (
        <div className="sticky bottom-0 -mx-4 border-t border-border bg-bg/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-bg/80">
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
