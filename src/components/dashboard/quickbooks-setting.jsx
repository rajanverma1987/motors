"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiRefreshCw } from "react-icons/fi";
import { FormContainer, FormSectionTitle } from "@/components/ui/form-layout";
import Button from "@/components/ui/button";
import Checkbox from "@/components/ui/checkbox";
import Select from "@/components/ui/select";
import Badge from "@/components/ui/badge";
import Table from "@/components/ui/table";
import { useAlert, useConfirm } from "@/components/confirm-provider";
import { useFormatDateTime } from "@/contexts/user-settings-context";
import { USER_SETTINGS_DEFAULTS } from "@/lib/user-settings";

/**
 * QuickBooks Online connect + sync settings for Simple Accounts tab.
 *
 * @param {{
 *   draft: Record<string, unknown>,
 *   updateDraft: (patch: Record<string, unknown>) => void,
 *   disabled?: boolean,
 * }} props
 */
export default function QuickBooksSetting({ draft, updateDraft, disabled = false }) {
  const alert = useAlert();
  const confirm = useConfirm();
  const formatDateTime = useFormatDateTime();
  const [statusLoading, setStatusLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const [recentSyncs, setRecentSyncs] = useState([]);
  const [incomeOptions, setIncomeOptions] = useState([]);
  const [expenseOptions, setExpenseOptions] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const workOrderStatuses = useMemo(() => {
    const list = Array.isArray(draft?.workOrderStatuses) ? draft.workOrderStatuses : [];
    return list.length ? list : [...USER_SETTINGS_DEFAULTS.workOrderStatuses];
  }, [draft?.workOrderStatuses]);

  const closedSelected = useMemo(() => {
    const raw = Array.isArray(draft?.quickBooksJobClosedStatuses)
      ? draft.quickBooksJobClosedStatuses
      : [];
    return new Set(raw.map((s) => String(s).trim().toLowerCase()).filter(Boolean));
  }, [draft?.quickBooksJobClosedStatuses]);

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch("/api/dashboard/integrations/quickbooks/status", {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load QuickBooks status");
      setConfigured(data.configured !== false);
      setConnected(!!data.connected);
      setCompanyName(String(data.companyName || "").trim());
      setRecentSyncs(Array.isArray(data.recentSyncs) ? data.recentSyncs : []);
    } catch (e) {
      console.error(e);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const loadAccounts = useCallback(async () => {
    setAccountsLoading(true);
    try {
      const res = await fetch("/api/dashboard/integrations/quickbooks/accounts", {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to load Chart of Accounts");
      const income = (data.incomeAccounts || []).map((a) => ({
        value: a.id,
        label: `${a.name}${a.accountType ? ` (${a.accountType})` : ""}`,
      }));
      const expense = (data.expenseAccounts || []).map((a) => ({
        value: a.id,
        label: `${a.name}${a.accountType ? ` (${a.accountType})` : ""}`,
      }));
      setIncomeOptions(income);
      setExpenseOptions(expense);
    } catch (e) {
      console.error(e);
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (connected) loadAccounts();
  }, [connected, loadAccounts]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const qbo = params.get("qbo");
    if (!qbo) return;
    if (qbo === "connected") {
      void alert({ title: "QuickBooks connected", message: "Your QuickBooks Online company is linked." });
      loadStatus();
    } else if (qbo === "error") {
      const msg = params.get("qboMsg") || "Connection failed";
      void alert({ title: "QuickBooks error", message: decodeURIComponent(msg), variant: "danger" });
    }
    params.delete("qbo");
    params.delete("qboMsg");
    const next = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", next.endsWith("?") ? window.location.pathname : next);
  }, [alert, loadStatus]);

  const toggleClosedStatus = (label) => {
    const canonical = String(label || "").trim();
    if (!canonical) return;
    const key = canonical.toLowerCase();
    const current = Array.isArray(draft?.quickBooksJobClosedStatuses)
      ? [...draft.quickBooksJobClosedStatuses]
      : [];
    const next = current.filter((s) => String(s).trim().toLowerCase() !== key);
    if (!closedSelected.has(key)) next.push(canonical);
    updateDraft({ quickBooksJobClosedStatuses: next });
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch("/api/dashboard/integrations/quickbooks/connect?format=json", {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not start QuickBooks connect");
      const url = String(data.url || "").trim();
      if (!/^https:\/\/appcenter\.intuit\.com\/connect\/oauth2/i.test(url)) {
        throw new Error("Invalid QuickBooks authorize URL from server.");
      }
      window.location.assign(url);
    } catch (e) {
      await alert({
        title: "QuickBooks connect",
        message: e.message || "Could not start QuickBooks connect",
        variant: "danger",
      });
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    const ok = await confirm({
      title: "Disconnect QuickBooks?",
      message:
        "This stops syncing customers, invoices, payments, and vendor POs. You can reconnect later.",
      confirmLabel: "Disconnect",
      variant: "danger",
    });
    if (!ok) return;
    setDisconnecting(true);
    try {
      const res = await fetch("/api/dashboard/integrations/quickbooks/disconnect", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Disconnect failed");
      updateDraft({ quickBooksEnabled: false });
      setConnected(false);
      setCompanyName("");
      setRecentSyncs([]);
      await alert({ title: "Disconnected", message: "QuickBooks Online has been disconnected." });
      await loadStatus();
    } catch (e) {
      await alert({ title: "Error", message: e.message || "Disconnect failed", variant: "danger" });
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/dashboard/integrations/quickbooks/sync-now", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Sync failed");
      await alert({
        title: "Sync complete",
        message: `Retried ${data.attempted || 0} item(s): ${data.synced || 0} synced, ${data.failed || 0} failed.`,
      });
      await loadStatus();
    } catch (e) {
      await alert({ title: "Error", message: e.message || "Sync failed", variant: "danger" });
    } finally {
      setSyncing(false);
    }
  };

  const incomeSelectOptions = [
    { value: "", label: accountsLoading ? "Loading…" : "Select income account" },
    ...incomeOptions,
  ];
  const expenseSelectOptions = [
    { value: "", label: accountsLoading ? "Loading…" : "Select expense account" },
    ...expenseOptions,
  ];

  const syncColumns = useMemo(
    () => [
      {
        key: "status",
        label: "Status",
        render: (row) => (
          <Badge
            variant={row.status === "success" ? "success" : "danger"}
            className="rounded-full px-2.5 py-0.5 text-xs"
          >
            {row.status === "success" ? "Success" : "Error"}
          </Badge>
        ),
      },
      {
        key: "entityType",
        label: "Type",
        render: (row) => String(row.entityType || "—"),
      },
      {
        key: "action",
        label: "Action",
        render: (row) => String(row.action || "—"),
      },
      {
        key: "message",
        label: "Message",
        render: (row) => (
          <span className="line-clamp-2 max-w-xs text-sm" title={row.message}>
            {row.message || "—"}
          </span>
        ),
      },
      {
        key: "occurredAt",
        label: "When",
        render: (row) => (row.occurredAt ? formatDateTime(row.occurredAt) : "—"),
      },
    ],
    [formatDateTime]
  );

  return (
    <FormContainer>
      <FormSectionTitle as="h2">QuickBooks Online</FormSectionTitle>
      <p className="mb-4 text-sm text-secondary">
        When a job reaches your selected closed status, IQMotorBase syncs customers, invoices, payments,
        and vendor purchase orders to QuickBooks — so you do not re-key data between the shop floor and
        your books.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {statusLoading ? (
          <Badge variant="default" className="rounded-full px-2.5 py-0.5 text-xs">
            Checking…
          </Badge>
        ) : connected ? (
          <Badge variant="success" className="rounded-full px-2.5 py-0.5 text-xs">
            Connected{companyName ? `: ${companyName}` : ""}
          </Badge>
        ) : (
          <Badge variant="warning" className="rounded-full px-2.5 py-0.5 text-xs">
            Not connected
          </Badge>
        )}
        {!configured ? (
          <span className="text-xs text-secondary">
            Server env vars INTUIT_CLIENT_ID / SECRET / REDIRECT_URI are not set.
          </span>
        ) : null}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {!connected ? (
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={disabled || !configured || statusLoading || connecting}
            onClick={() => void handleConnect()}
          >
            {connecting ? "Opening QuickBooks…" : "Connect to QuickBooks"}
          </Button>
        ) : (
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={disabled || disconnecting}
              onClick={handleDisconnect}
            >
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={disabled || syncing || !draft?.quickBooksEnabled}
              onClick={handleSyncNow}
            >
              <FiRefreshCw className={`h-4 w-4 shrink-0 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing…" : "Sync now"}
            </Button>
          </>
        )}
      </div>

      <div className="mb-6">
        <Checkbox
          label="Enable QuickBooks sync"
          checked={!!draft?.quickBooksEnabled}
          disabled={disabled || !connected}
          onChange={(e) => updateDraft({ quickBooksEnabled: !!e.target.checked })}
        />
        {!connected ? (
          <p className="mt-1 text-xs text-secondary">Connect QuickBooks before enabling sync.</p>
        ) : null}
      </div>

      <div className="mb-6">
        <p className="mb-2 text-sm font-medium text-title">Job closed status</p>
        <p className="mb-3 text-xs text-secondary">
          Sync fires when a job&apos;s status moves into any of the statuses you select (from your work-order
          statuses).
        </p>
        <div className="flex flex-col gap-2">
          {workOrderStatuses.map((label) => {
            const key = String(label).trim().toLowerCase();
            return (
              <Checkbox
                key={label}
                label={label}
                checked={closedSelected.has(key)}
                disabled={disabled}
                onChange={() => toggleClosedStatus(label)}
              />
            );
          })}
        </div>
        {draft?.quickBooksEnabled && closedSelected.size === 0 ? (
          <p className="mt-2 text-xs text-danger">Select at least one status when sync is enabled.</p>
        ) : null}
      </div>

      {connected ? (
        <div className="mb-6 grid max-w-xl gap-4 sm:grid-cols-1">
          <Select
            label="Default income account (invoices)"
            options={incomeSelectOptions}
            value={draft?.quickBooksDefaultIncomeAccountId || ""}
            disabled={disabled || accountsLoading}
            searchable
            onChange={(e) =>
              updateDraft({ quickBooksDefaultIncomeAccountId: e.target.value || "" })
            }
          />
          <Select
            label="Default expense account (vendor bills)"
            options={expenseSelectOptions}
            value={draft?.quickBooksDefaultExpenseAccountId || ""}
            disabled={disabled || accountsLoading}
            searchable
            onChange={(e) =>
              updateDraft({ quickBooksDefaultExpenseAccountId: e.target.value || "" })
            }
          />
        </div>
      ) : null}

      <div>
        <p className="mb-2 text-sm font-medium text-title">Recent sync activity</p>
        {recentSyncs.length === 0 ? (
          <p className="text-sm text-secondary">No sync activity yet.</p>
        ) : (
          <Table
            columns={syncColumns}
            data={recentSyncs}
            rowKey="id"
            emptyMessage="No sync activity yet."
            responsive
          />
        )}
      </div>
    </FormContainer>
  );
}
