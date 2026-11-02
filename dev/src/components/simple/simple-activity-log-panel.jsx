"use client";

import { useCallback, useEffect, useState } from "react";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import { useFormatDateTime } from "@/contexts/user-settings-context";

const ACTION_LABEL = {
  saved: "Saved",
  removed: "Removed",
  restored: "Restored",
  deleted: "Deleted",
};

function actionVariant(action) {
  if (action === "deleted") return "danger";
  if (action === "removed") return "warning";
  if (action === "restored") return "success";
  return "default";
}

export default function SimpleActivityLogPanel({
  recordKind = "",
  recordId = "",
  searchable = false,
}) {
  const formatDateTime = useFormatDateTime();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (q) => {
      const id = String(recordId || "").trim();
      const text = String(q ?? query).trim();
      if (!searchable && !id) {
        setItems([]);
        return;
      }
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (id) params.set("recordId", id);
        if (recordKind && id) params.set("kind", recordKind);
        if (text) params.set("q", text);
        const res = await fetch(`/api/dashboard/activity-log?${params.toString()}`, {
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to load activity");
        setItems(Array.isArray(data.items) ? data.items : []);
      } catch (err) {
        setError(err?.message || "Failed to load activity");
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [query, recordId, recordKind, searchable]
  );

  useEffect(() => {
    void load("");
    // Initial load only. Search submits call load with the typed query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId, recordKind]);

  return (
    <section className="mt-4 border border-border bg-surface px-3 py-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-title">Activity</h3>
        {searchable ? (
          <form
            className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:max-w-md"
            onSubmit={(e) => {
              e.preventDefault();
              void load(query);
            }}
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search number, customer, or vendor"
              className="h-8 min-w-0 flex-1 border border-border bg-background px-2 text-sm text-title"
              aria-label="Search activity log"
            />
            <Button type="submit" size="sm" variant="outline" disabled={loading}>
              Search
            </Button>
          </form>
        ) : null}
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {loading ? <p className="text-sm text-secondary">Loading activity...</p> : null}
      {!loading && !items.length ? (
        <p className="text-sm text-secondary">
          {searchable
            ? "No matching activity. Search a job number or PO number, including ones deleted permanently."
            : "No activity yet."}
        </p>
      ) : null}
      {items.length ? (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="py-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={actionVariant(item.action)} className="rounded-full px-2.5 py-0.5 text-xs">
                  {ACTION_LABEL[item.action] || item.action}
                </Badge>
                <span className="font-medium text-title">{item.recordNumber || item.recordId}</span>
                {item.partyName ? <span className="text-secondary">{item.partyName}</span> : null}
                <span className="text-secondary">{formatDateTime(item.createdAt)}</span>
                <span className="text-secondary">{item.actorName || item.actorEmail}</span>
              </div>
              {item.summary ? <p className="mt-1 text-secondary">{item.summary}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
