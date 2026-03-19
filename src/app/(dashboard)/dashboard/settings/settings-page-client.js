"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Button from "@/components/ui/button";
import Checkbox from "@/components/ui/checkbox";
import Select from "@/components/ui/select";
import Textarea from "@/components/ui/textarea";
import Tabs from "@/components/ui/tabs";
import { FormContainer, FormSectionTitle } from "@/components/ui/form-layout";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { useToast } from "@/components/toast-provider";
import { useAuth } from "@/contexts/auth-context";
import { useUserSettings } from "@/contexts/user-settings-context";
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(() => ({ ...USER_SETTINGS_DEFAULTS }));
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef(null);

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
              <div className="max-w-md">
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
              <div className="max-w-md">
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
              <FormSectionTitle as="h2">Work order statuses</FormSectionTitle>
              <p className="mb-3 text-sm text-secondary">
                List every status technicians can set on a work order (one per line, top to bottom = dropdown order). Then choose which of those appear as columns on the{" "}
                <span className="font-medium text-title">Shop floor job board</span> and in what order (left to right).
              </p>
              <Textarea
                label="All statuses (one per line)"
                value={Array.isArray(draft.workOrderStatuses) ? draft.workOrderStatuses.join("\n") : ""}
                onChange={(e) => {
                  const workOrderStatuses = e.target.value
                    .split("\n")
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .slice(0, 25);
                  setDraft((prev) => ({
                    ...prev,
                    workOrderStatuses,
                    shopFloorBoardOrder: (Array.isArray(prev.shopFloorBoardOrder)
                      ? prev.shopFloorBoardOrder
                      : []
                    ).filter((s) => workOrderStatuses.includes(s)),
                  }));
                }}
                rows={8}
                placeholder={"Assigned\nIn Progress\nWaiting Parts\nQC\nCompleted"}
              />
              <div className="mt-6 rounded-lg border border-border bg-form-bg/80 p-4">
                <p className="mb-1 text-sm font-medium text-title">Shop floor job board columns</p>
                <p className="mb-4 text-xs text-secondary">
                  Only statuses below appear as swimlanes on the job board. Use ↑ ↓ to change column order. Add others from the list when you need them on the floor.
                </p>
                {(() => {
                  const statuses = Array.isArray(draft.workOrderStatuses) ? draft.workOrderStatuses : [];
                  const board = Array.isArray(draft.shopFloorBoardOrder)
                    ? draft.shopFloorBoardOrder.filter((s) => statuses.includes(s))
                    : [];
                  const notOnBoard = statuses.filter((s) => !board.includes(s));
                  const move = (label, delta) => {
                    setDraft((prev) => {
                      const st = Array.isArray(prev.workOrderStatuses) ? prev.workOrderStatuses : [];
                      let b = (Array.isArray(prev.shopFloorBoardOrder) ? prev.shopFloorBoardOrder : []).filter(
                        (x) => st.includes(x)
                      );
                      const i = b.indexOf(label);
                      if (i < 0) return prev;
                      const j = i + delta;
                      if (j < 0 || j >= b.length) return prev;
                      const next = [...b];
                      [next[i], next[j]] = [next[j], next[i]];
                      return { ...prev, shopFloorBoardOrder: next };
                    });
                  };
                  return (
                    <>
                      {board.length === 0 ? (
                        <p className="mb-3 text-sm text-secondary">
                          No columns on the board yet. Add statuses from the list below — work orders still use every status above; jobs only show under columns you add, plus any extra status that has open jobs.
                        </p>
                      ) : (
                        <ul className="mb-4 space-y-2">
                          {board.map((label) => (
                            <li
                              key={label}
                              className="flex items-center gap-2 rounded-md border border-border bg-bg px-3 py-2 text-sm"
                            >
                              <span className="min-w-0 flex-1 font-medium text-title">{label}</span>
                              <div className="flex shrink-0 gap-1">
                                <button
                                  type="button"
                                  className="rounded p-1.5 text-secondary hover:bg-card hover:text-title"
                                  aria-label={`Move ${label} left`}
                                  onClick={() => move(label, -1)}
                                >
                                  <FiChevronUp className="h-4 w-4 -rotate-90" aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  className="rounded p-1.5 text-secondary hover:bg-card hover:text-title"
                                  aria-label={`Move ${label} right`}
                                  onClick={() => move(label, 1)}
                                >
                                  <FiChevronDown className="h-4 w-4 -rotate-90" aria-hidden />
                                </button>
                                <button
                                  type="button"
                                  className="ml-1 rounded border border-border px-2 py-1 text-xs text-secondary hover:bg-danger/10 hover:text-danger"
                                  onClick={() =>
                                    setDraft((prev) => ({
                                      ...prev,
                                      shopFloorBoardOrder: (
                                        Array.isArray(prev.shopFloorBoardOrder) ? prev.shopFloorBoardOrder : []
                                      ).filter((x) => x !== label),
                                    }))
                                  }
                                >
                                  Remove
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                      {notOnBoard.length > 0 && (
                        <div>
                          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-secondary">
                            Not on job board
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {notOnBoard.map((label) => (
                              <button
                                key={label}
                                type="button"
                                className="rounded-full border border-border bg-bg px-3 py-1.5 text-sm text-primary hover:bg-primary/10"
                                onClick={() =>
                                  setDraft((prev) => {
                                    const st = Array.isArray(prev.workOrderStatuses)
                                      ? prev.workOrderStatuses
                                      : [];
                                    let b = (
                                      Array.isArray(prev.shopFloorBoardOrder) ? prev.shopFloorBoardOrder : []
                                    ).filter((x) => st.includes(x));
                                    if (b.includes(label)) return prev;
                                    return { ...prev, shopFloorBoardOrder: [...b, label] };
                                  })
                                }
                              >
                                + {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </FormContainer>
          </div>
        ),
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
      draft.workOrderStatuses,
      draft.shopFloorBoardOrder,
      draft.inventoryLocations,
      logoUploading,
      user?.email,
      user?.shopName,
    ]
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-secondary">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col px-4 py-8">
      <div className="mb-8 shrink-0 border-b border-border pb-6">
        <h1 className="text-2xl font-bold text-title">Settings</h1>
        <p className="mt-1 text-sm text-secondary">
          Preferences for your account. More options will appear here over time.
        </p>
      </div>

      <Tabs defaultTab="account" tabs={settingsTabs} />

      <div className="sticky bottom-0 -mx-4 border-t border-border bg-bg/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-bg/80">
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
