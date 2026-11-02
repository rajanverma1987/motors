"use client";

import { useCallback, useEffect, useState } from "react";
import { FiEye, FiTrash2 } from "react-icons/fi";
import Button from "@/components/ui/button";
import { useConfirm } from "@/components/confirm-provider";
import { useToast } from "@/components/toast-provider";
import { appFetch } from "./api";
import { useIqwireAuth } from "./auth-context";

export default function SavedScreen({ onOpenItem }) {
  const confirm = useConfirm();
  const toast = useToast();
  const { token } = useIqwireAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await appFetch("/api/mobile-app/saved", { token });
      const list = Array.isArray(data.items) ? data.items : [];
      setItems(list.filter((item) => item.calculatorType === "cm_best_match"));
    } catch (err) {
      toast.error(err.message || "Could not load saved calculations.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (item) => {
    const ok = await confirm({
      title: "Delete saved calculation",
      message: `Remove "${item.title}"? This cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await appFetch(`/api/mobile-app/saved/${item.id}`, { token, method: "DELETE" });
      setItems((prev) => prev.filter((x) => x.id !== item.id));
    } catch (err) {
      toast.error(err.message || "Could not delete.");
    }
  };

  if (loading) {
    return <p className="px-4 py-8 text-center text-sm text-secondary">Loading saved calculations…</p>;
  }

  if (!items.length) {
    return (
      <div className="px-4 py-10 text-center">
        <p className="text-sm text-secondary">No saved CM Best Match runs yet. Calculate a mix, then save it with a name.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-4 py-3">
      {items.map((item) => (
        <div key={item.id} className="flex items-center gap-2 rounded-xl border border-border bg-card px-2 py-2">
          <button
            type="button"
            className="rounded-md p-2 text-primary hover:bg-primary/10"
            aria-label={`View ${item.title}`}
            onClick={() => onOpenItem?.(item)}
          >
            <FiEye className="h-4 w-4 shrink-0" />
          </button>
          <button
            type="button"
            className="rounded-md p-2 text-danger hover:bg-danger/10"
            aria-label={`Delete ${item.title}`}
            onClick={() => remove(item)}
          >
            <FiTrash2 className="h-4 w-4 shrink-0" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-title">{item.title}</p>
            <p className="text-xs text-secondary">
              {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
            </p>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={load}>
        Refresh
      </Button>
    </div>
  );
}
