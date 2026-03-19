"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import { useToast } from "@/components/toast-provider";

/**
 * Toolbar above quote "Other cost" table: add rows from master inventory, create vendor POs for shortages.
 */
export default function QuoteInventoryPartsControls({
  partsLines,
  onChangePartsLines,
  /** Mongo id when editing a saved quote — required to link job POs */
  quoteId,
  fmtPrice,
}) {
  const toast = useToast();
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [poOpen, setPoOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  /** False until inventory has been fetched for current linked part IDs — avoids treating "not loaded yet" as 0 stock. */
  const [inventoryReady, setInventoryReady] = useState(false);
  const [inventoryLoadError, setInventoryLoadError] = useState(false);
  const [pickerQty, setPickerQty] = useState({});
  const [poVendorsByLine, setPoVendorsByLine] = useState({});
  const [generatingPo, setGeneratingPo] = useState(false);

  /** Stable key of all inventoryItemIds on the quote (for preload / refetch). */
  const linkedIdsKey = useMemo(() => {
    const lines = Array.isArray(partsLines) ? partsLines : [];
    const ids = new Set();
    for (const r of lines) {
      const id = String(r?.inventoryItemId ?? "").trim();
      if (id) ids.add(id);
    }
    return [...ids].sort().join(",");
  }, [partsLines]);

  const loadInventory = useCallback(
    async (signal) => {
      setLoadingItems(true);
      try {
        const res = await fetch("/api/dashboard/inventory/items", {
          credentials: "include",
          cache: "no-store",
          ...(signal ? { signal } : {}),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load inventory");
        setItems(Array.isArray(data) ? data : []);
        setInventoryLoadError(false);
      } catch (e) {
        if (e?.name === "AbortError") return;
        toast.error(e.message || "Could not load inventory");
        setItems([]);
        setInventoryLoadError(true);
      } finally {
        setLoadingItems(false);
      }
    },
    [toast]
  );

  /** When quote lines reference inventory, preload items so shortage math uses real on-hand (not empty map → false shortage). */
  useEffect(() => {
    if (!linkedIdsKey) {
      setInventoryReady(true);
      setInventoryLoadError(false);
      return;
    }
    const ac = new AbortController();
    setInventoryReady(false);
    setInventoryLoadError(false);
    (async () => {
      await loadInventory(ac.signal);
      if (!ac.signal.aborted) setInventoryReady(true);
    })();
    return () => ac.abort();
  }, [linkedIdsKey, loadInventory]);

  const loadVendors = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/vendors", { credentials: "include", cache: "no-store" });
      const data = await res.json();
      if (!res.ok) return;
      setVendors(Array.isArray(data) ? data : []);
    } catch {
      setVendors([]);
    }
  }, []);

  useEffect(() => {
    if (!inventoryOpen && !poOpen) return;
    const ac = new AbortController();
    loadInventory(ac.signal);
    return () => ac.abort();
  }, [inventoryOpen, poOpen, loadInventory]);

  useEffect(() => {
    if (!poOpen) return;
    loadVendors();
  }, [poOpen, loadVendors]);

  const itemMap = useMemo(() => {
    const m = new Map();
    for (const it of items) m.set(it.id, it);
    return m;
  }, [items]);

  const needByItem = useMemo(() => {
    const m = new Map();
    const lines = Array.isArray(partsLines) ? partsLines : [];
    for (const row of lines) {
      const id = String(row?.inventoryItemId ?? "").trim();
      if (!id) continue;
      const q = parseFloat(row?.qty ?? "1");
      if (!Number.isFinite(q) || q <= 0) continue;
      m.set(id, (m.get(id) || 0) + q);
    }
    return m;
  }, [partsLines]);

  const shortageRows = useMemo(() => {
    const out = [];
    for (const [invId, need] of needByItem) {
      const it = itemMap.get(invId);
      const onHand = it ? Number(it.onHand) || 0 : 0;
      const reserved = it ? Number(it.reserved) || 0 : 0;
      const avail = onHand - reserved;
      const short = Math.max(0, need - avail);
      if (short <= 0) continue;
      const sampleLine = (Array.isArray(partsLines) ? partsLines : []).find(
        (r) => String(r?.inventoryItemId ?? "").trim() === invId
      );
      out.push({
        inventoryItemId: invId,
        description: it?.name || sampleLine?.item || "Part",
        shortQty: short,
        uom: sampleLine?.uom ?? it?.uom ?? "ea",
        unitPrice: sampleLine?.price ?? "0",
      });
    }
    return out;
  }, [needByItem, itemMap, partsLines]);

  const vendorOptions = useMemo(
    () =>
      vendors.map((v) => ({
        value: v.id,
        label: v.name || v.id || "—",
      })),
    [vendors]
  );

  const hasShortage = inventoryReady && !inventoryLoadError && shortageRows.length > 0;

  const handleAddFromInventory = () => {
    const nextLines = [...(Array.isArray(partsLines) ? partsLines : [])];
    let added = 0;
    for (const it of items) {
      const q = parseFloat(pickerQty[it.id] ?? "0");
      if (!Number.isFinite(q) || q <= 0) continue;
      nextLines.push({
        item: it.name || it.sku || "Part",
        qty: String(q),
        uom: (it.uom && String(it.uom).trim()) || "ea",
        price: "0",
        inventoryItemId: it.id,
      });
      added++;
    }
    if (added === 0) {
      toast.error("Enter a quantity for at least one part.");
      return;
    }
    onChangePartsLines(nextLines);
    setPickerQty({});
    setInventoryOpen(false);
    toast.success(`Added ${added} line(s) from inventory.`);
  };

  const openPoModal = () => {
    if (!inventoryReady) {
      toast.error("Still loading stock levels…");
      return;
    }
    if (inventoryLoadError) {
      toast.error("Could not verify stock. Try again in a moment.");
      return;
    }
    if (shortageRows.length === 0) {
      toast.error("No stock shortage — available quantity covers this quote.");
      return;
    }
    const init = {};
    for (const row of shortageRows) {
      init[row.inventoryItemId] = vendorOptions[0]?.value ?? "";
    }
    setPoVendorsByLine(init);
    setPoOpen(true);
  };

  const handleGeneratePos = async () => {
    const groupsMap = new Map();
    for (const row of shortageRows) {
      const vid = String(poVendorsByLine[row.inventoryItemId] ?? "").trim();
      if (!vid) {
        toast.error(`Select a vendor for: ${row.description}`);
        return;
      }
      if (!groupsMap.has(vid)) groupsMap.set(vid, []);
      groupsMap.get(vid).push({
        description: row.description,
        qty: String(row.shortQty),
        uom: row.uom || "ea",
        unitPrice: String(row.unitPrice ?? "0"),
        inventoryItemId: row.inventoryItemId,
      });
    }
    const groups = [...groupsMap.entries()].map(([vendorId, lineItems]) => ({
      vendorId,
      lineItems,
    }));
    setGeneratingPo(true);
    try {
      const res = await fetch("/api/dashboard/inventory/generate-pos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          quoteId: quoteId || "",
          groups,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create POs");
      const n = data.purchaseOrders?.length ?? 0;
      toast.success(n === 1 ? "Purchase order created." : `${n} purchase orders created.`);
      setPoOpen(false);
    } catch (e) {
      toast.error(e.message || "Could not create POs");
    } finally {
      setGeneratingPo(false);
    }
  };

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={() => setInventoryOpen(true)}>
        + Add parts
      </Button>
      {linkedIdsKey && !inventoryReady ? (
        <span className="text-xs text-secondary tabular-nums" aria-live="polite">
          Checking stock for linked parts…
        </span>
      ) : null}
      {hasShortage ? (
        <Button type="button" variant="primary" size="sm" onClick={openPoModal}>
          Create vendor PO(s) for shortages
        </Button>
      ) : null}
      {!quoteId ? (
        <span className="text-xs text-secondary">
          Save the quote to link new POs to this RFQ as job POs.
        </span>
      ) : null}

      <Modal
        open={inventoryOpen}
        onClose={() => setInventoryOpen(false)}
        title="Add parts from inventory"
        size="lg"
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => setInventoryOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={handleAddFromInventory}>
              Add to quote
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-secondary">
          Enter quantity for each part to add. You can request more than available — use{" "}
          <strong className="text-title">Create vendor PO(s)</strong> afterward to cover the gap.
        </p>
        {loadingItems ? (
          <p className="text-sm text-secondary">Loading inventory…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-secondary">
            No inventory items yet. Add SKUs under <strong>Inventory</strong> in the sidebar.
          </p>
        ) : (
          <div className="max-h-[50vh] overflow-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-card text-left text-xs font-medium text-title">
                <tr>
                  <th className="px-3 py-2">Part</th>
                  <th className="px-3 py-2">UOM</th>
                  <th className="px-3 py-2">Available</th>
                  <th className="px-3 py-2 w-28">Qty</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const avail = Number(it.available) || 0;
                  return (
                    <tr key={it.id} className="border-b border-border last:border-b-0">
                      <td className="px-3 py-2">
                        <div className="font-medium text-title">{it.name}</div>
                        {it.sku ? <div className="text-xs text-secondary">SKU: {it.sku}</div> : null}
                      </td>
                      <td className="px-3 py-2 text-secondary tabular-nums">{it.uom || "ea"}</td>
                      <td className="px-3 py-2 tabular-nums text-secondary">
                        {avail}
                        {it.threshold > 0 && avail <= it.threshold ? (
                          <span className="ml-1 text-amber-600 dark:text-amber-400">Low</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          className="!py-1"
                          value={pickerQty[it.id] ?? ""}
                          onChange={(e) =>
                            setPickerQty((prev) => ({ ...prev, [it.id]: e.target.value }))
                          }
                          placeholder="0"
                          aria-label={`Qty for ${it.name}`}
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

      <Modal
        open={poOpen}
        onClose={() => setPoOpen(false)}
        title="Vendor PO for shortages"
        size="lg"
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => setPoOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={generatingPo || vendorOptions.length === 0 || shortageRows.length === 0}
              onClick={handleGeneratePos}
            >
              {generatingPo ? "Creating…" : "Generate vendor PO(s)"}
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-secondary">
          One PO will be created per vendor. Lines include the linked inventory item so receiving in Logistics can add
          stock automatically.
        </p>
        {vendorOptions.length === 0 ? (
          <p className="text-sm text-danger">Add vendors first (Procurement → Vendors).</p>
        ) : shortageRows.length === 0 ? (
          <p className="text-sm text-secondary">
            No shortage lines to order — stock may have updated. Close this dialog and check the quote; the button only
            appears when linked parts need more than available (on hand minus reserved).
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {shortageRows.map((row) => (
              <div
                key={row.inventoryItemId}
                className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-secondary">Part / qty to order</p>
                  <p className="font-medium text-title">{row.description}</p>
                  <p className="text-sm text-secondary">
                    Order qty: <span className="tabular-nums text-title">{row.shortQty}</span> {row.uom} · Unit{" "}
                    {fmtPrice ? fmtPrice(row.unitPrice) : row.unitPrice}
                  </p>
                </div>
                <div className="w-full min-w-[200px] sm:w-56">
                  <Select
                    label="Vendor"
                    options={vendorOptions}
                    value={poVendorsByLine[row.inventoryItemId] ?? ""}
                    onChange={(e) =>
                      setPoVendorsByLine((prev) => ({
                        ...prev,
                        [row.inventoryItemId]: e.target.value,
                      }))
                    }
                    placeholder="Select vendor"
                    searchable
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
