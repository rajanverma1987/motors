"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/modal";
import { FiSearch, FiExternalLink, FiChevronDown, FiChevronRight } from "react-icons/fi";

/**
 * @typedef {{ type: string, typeLabel: string, id: string, title: string, subtitle?: string, openHref: string, linked?: Array<{ type: string, label: string, title: string, openHref: string }> }} SearchHit
 */

export default function GlobalSearchModal({ open, onClose }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(/** @type {SearchHit[]} */ ([]));
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState("");
  const [expanded, setExpanded] = useState(/** @type {Record<string, boolean>} */ ({}));
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setHint("");
      setExpanded({});
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const runSearch = useCallback(async (q) => {
    const t = q.trim();
    if (t.length < 2) {
      setResults([]);
      setHint(t.length ? "Type at least 2 characters" : "");
      setLoading(false);
      return;
    }
    setLoading(true);
    setHint("");
    try {
      const res = await fetch(`/api/dashboard/search?q=${encodeURIComponent(t)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResults(Array.isArray(data.results) ? data.results : []);
      if (!data.results?.length) setHint("No matches");
    } catch {
      setResults([]);
      setHint("Search failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSearch(query);
    }, 320);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open, runSearch]);

  const go = (href) => {
    onClose();
    router.push(href);
  };

  const rowKey = (r) => `${r.type}-${r.id}`;

  return (
    <Modal open={open} onClose={onClose} title="Search" size="2xl">
      <div className="flex flex-col gap-3">
        <p className="text-xs text-secondary">
          Leads, customers, motors, quotes, work orders, invoices, vendors, purchase orders
        </p>
        <div className="relative">
          <FiSearch
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary"
            aria-hidden
          />
          <input
            ref={inputRef}
            data-global-search-input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, #, email, serial, RFQ, PO…"
            aria-label="Search query"
            className="w-full rounded-md border border-border bg-bg py-2.5 pl-9 pr-3 text-sm text-title placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        {loading && <p className="text-sm text-secondary">Searching…</p>}
        {!loading && hint && results.length === 0 && (
          <p className="text-sm text-secondary">{hint}</p>
        )}
        <ul className="max-h-[min(60vh,420px)] space-y-2 overflow-y-auto pr-1">
          {results.map((r) => {
            const key = rowKey(r);
            const hasLinked = Array.isArray(r.linked) && r.linked.length > 0;
            const isOpen = expanded[key];
            return (
              <li
                key={key}
                className="rounded-lg border border-border bg-card text-sm shadow-sm"
              >
                <div className="flex items-start gap-2 p-3">
                  {hasLinked ? (
                    <button
                      type="button"
                      onClick={() => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))}
                      className="mt-0.5 shrink-0 rounded p-0.5 text-secondary hover:bg-muted hover:text-title"
                      aria-expanded={isOpen}
                      aria-label={isOpen ? "Hide linked records" : "Show linked records"}
                    >
                      {isOpen ? (
                        <FiChevronDown className="h-5 w-5" />
                      ) : (
                        <FiChevronRight className="h-5 w-5" />
                      )}
                    </button>
                  ) : (
                    <span className="w-6 shrink-0" aria-hidden />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                        {r.typeLabel}
                      </span>
                      <span className="font-medium text-title">{r.title}</span>
                    </div>
                    {r.subtitle ? (
                      <p className="mt-1 line-clamp-2 text-xs text-secondary">{r.subtitle}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => go(r.openHref)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border bg-bg px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary/10"
                    title="Open"
                  >
                    <FiExternalLink className="h-3.5 w-3.5" aria-hidden />
                    Open
                  </button>
                </div>
                {hasLinked && isOpen && (
                  <div className="border-t border-border bg-muted/30 px-3 py-2 pl-11">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-secondary">
                      Linked
                    </p>
                    <ul className="space-y-1.5">
                      {r.linked.map((link, i) => (
                        <li
                          key={`${key}-l-${i}`}
                          className="flex items-center justify-between gap-2 rounded-md bg-card/80 px-2 py-1.5"
                        >
                          <div className="min-w-0">
                            <span className="text-xs text-secondary">{link.label}</span>
                            <span className="ml-2 text-title">{link.title}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => go(link.openHref)}
                            className="inline-flex shrink-0 items-center gap-1 rounded border border-border px-2 py-1 text-xs text-primary hover:bg-primary/10"
                          >
                            <FiExternalLink className="h-3 w-3" aria-hidden />
                            Open
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </Modal>
  );
}
