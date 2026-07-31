"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/modal";
import Button from "@/components/ui/button";
import { useAlert } from "@/components/confirm-provider";
import { fetchAllPaginatedDashboardItems } from "@/lib/fetch-all-paginated-dashboard-items";
import { emptyOtherLine } from "@/lib/simple-service-proposal-form";

const FIELD_INPUT =
  "h-7 w-full min-w-0 rounded-none border border-border bg-primary/[0.04] px-1.5 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10 dark:text-title";

/**
 * Pick inventory parts + qty → Other Items lines for Simple Service Proposal.
 */
export default function SimpleAddFromInventoryModal({
  open,
  onClose,
  onAddLines,
  zIndex = 140,
}) {
  const alert = useAlert();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [pickerQty, setPickerQty] = useState({});

  useEffect(() => {
    if (!open) {
      setPickerQty({});
      setSearch("");
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await fetchAllPaginatedDashboardItems("/api/dashboard/inventory/items");
        if (!cancelled) setItems(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!cancelled) {
          setItems([]);
          await alert({
            title: "Error",
            message: e.message || "Could not load inventory",
            variant: "danger",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, alert]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const hay = [it.name, it.sku, it.uom, it.location, it.available, it.onHand]
        .map((v) => String(v ?? "").toLowerCase())
        .join(" ");
      return hay.includes(q);
    });
  }, [items, search]);

  const handleSubmit = async () => {
    const lines = [];
    for (const it of items) {
      const q = parseFloat(pickerQty[it.id] ?? "0");
      if (!Number.isFinite(q) || q <= 0) continue;
      const uom = (it.uom && String(it.uom).trim()) || "ea";
      const name = String(it.name || it.sku || "Part").trim() || "Part";
      lines.push({
        ...emptyOtherLine(),
        description: q === 1 ? name : `${name} (Qty: ${q})`,
        uom,
        price: "",
        qty: String(q),
        inventoryItemId: it.id,
      });
    }
    if (lines.length === 0) {
      await alert({
        title: "Quantity required",
        message: "Enter a quantity for at least one part.",
        variant: "danger",
      });
      return;
    }
    onAddLines?.(lines);
    setPickerQty({});
    onClose?.();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add from inventory"
      size="lg"
      width="min(720px, 96vw)"
      zIndex={zIndex}
      closeOnOutsideClick={false}
      actions={
        <Button type="button" variant="primary" size="sm" onClick={() => void handleSubmit()} disabled={loading}>
          Add to Other Items
        </Button>
      }
    >
      <p className="mb-2 text-xs text-secondary">
        Enter quantity for each part to add. Lines appear under Other Items (you can set price after).
      </p>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className={`${FIELD_INPUT} mb-2`}
        placeholder="Search part, SKU, location…"
        aria-label="Search inventory"
        disabled={loading}
      />
      {loading ? (
        <p className="text-sm text-secondary">Loading inventory…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-secondary">
          No inventory items yet. Add parts under the Inventory tab.
        </p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-secondary">No parts match your search.</p>
      ) : (
        <div className="max-h-[50vh] overflow-auto border border-border">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 border-b border-border bg-muted/40 text-left text-xs font-semibold text-title">
              <tr>
                <th className="px-2 py-1.5">Part</th>
                <th className="w-16 px-2 py-1.5">UOM</th>
                <th className="w-20 px-2 py-1.5 text-right">Available</th>
                <th className="w-24 px-2 py-1.5">Qty</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => {
                const avail = Number(it.available) || 0;
                const low = it.threshold > 0 && avail <= it.threshold;
                return (
                  <tr key={it.id} className="border-b border-border last:border-b-0">
                    <td className="px-2 py-1.5">
                      <div className="font-medium text-title">{it.name || "—"}</div>
                      {it.sku ? <div className="text-xs text-secondary">SKU: {it.sku}</div> : null}
                    </td>
                    <td className="px-2 py-1.5 tabular-nums text-secondary">{it.uom || "ea"}</td>
                    <td
                      className={`px-2 py-1.5 text-right tabular-nums ${
                        low ? "font-medium text-amber-600 dark:text-amber-400" : "text-secondary"
                      }`}
                    >
                      {avail}
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        value={pickerQty[it.id] ?? ""}
                        onChange={(e) =>
                          setPickerQty((prev) => ({ ...prev, [it.id]: e.target.value }))
                        }
                        className={FIELD_INPUT}
                        placeholder="0"
                        aria-label={`Qty for ${it.name || "part"}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
