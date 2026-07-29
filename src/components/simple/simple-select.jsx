"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiChevronDown } from "react-icons/fi";
import { mapRectForBodyFixedPosition } from "@/lib/apply-dashboard-zoom";
import { getFocusableElements } from "@/lib/focusable-elements";

const TRIGGER =
  "flex h-7 w-full min-w-0 items-center gap-1 rounded-sm border border-border bg-primary/[0.04] px-1.5 text-left text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60 dark:bg-primary/10";

const PILL_TRIGGER =
  "inline-flex h-auto min-h-0 w-full max-w-full items-center gap-1 rounded-sm border border-border bg-transparent px-2.5 py-0.5 text-left text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60";

const DROPDOWN_Z = 10050;

/**
 * Compact select styled for Simple portal dense forms (light primary field chrome).
 * API mirrors ui/Select: onChange({ target: { name, value } }).
 *
 * @param {{ value: string, label: string }[]} props.options
 * @param {boolean} [props.searchable=false]
 */
export default function SimpleSelect({
  options = [],
  value = "",
  onChange,
  name,
  id: idProp,
  placeholder = "Select…",
  disabled = false,
  searchable = false,
  className = "",
  triggerClassName = "",
  triggerStyle,
  variant = "field",
  "aria-label": ariaLabel,
}) {
  const uid = useId();
  const id = idProp || uid;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [rect, setRect] = useState(null);
  const [highlight, setHighlight] = useState(-1);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const searchRef = useRef(null);

  const selected = useMemo(
    () => options.find((o) => String(o.value) === String(value)) || null,
    [options, value]
  );

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => String(o.label || "").toLowerCase().includes(q));
  }, [options, query, searchable]);

  const focusTrigger = () => {
    requestAnimationFrame(() => {
      triggerRef.current?.focus();
    });
  };

  const focusAdjacentFromTrigger = (shiftKey) => {
    const trigger = triggerRef.current;
    if (!trigger || typeof document === "undefined") {
      focusTrigger();
      return;
    }
    const nodes = getFocusableElements(document.body).filter((el) => {
      if (el === trigger) return true;
      if (listRef.current?.contains(el)) return false;
      return true;
    });
    const idx = nodes.indexOf(trigger);
    if (idx < 0) {
      focusTrigger();
      return;
    }
    const next = shiftKey ? nodes[idx - 1] : nodes[idx + 1];
    if (next) next.focus();
    else trigger.focus();
  };

  const closeList = ({ restoreFocus = true, tabShift = null } = {}) => {
    setOpen(false);
    if (tabShift !== null) {
      requestAnimationFrame(() => focusAdjacentFromTrigger(tabShift));
      return;
    }
    if (restoreFocus) focusTrigger();
  };

  const updateRect = () => {
    if (!triggerRef.current) return;
    const r = mapRectForBodyFixedPosition(triggerRef.current.getBoundingClientRect());
    setRect({ top: r.bottom + 2, left: r.left, width: Math.max(r.width, 140) });
  };

  useEffect(() => {
    if (!open) {
      setRect(null);
      setQuery("");
      setHighlight(-1);
      return undefined;
    }
    updateRect();
    const onMove = () => updateRect();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    const t = window.setTimeout(() => {
      if (searchable) searchRef.current?.focus();
      else listRef.current?.querySelector('[role="option"]')?.focus?.();
    }, 0);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open, searchable]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current?.contains(e.target) || listRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc, true);
    return () => document.removeEventListener("mousedown", onDoc, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (filtered.length === 0) {
      setHighlight(-1);
      return;
    }
    const idx = filtered.findIndex((o) => String(o.value) === String(value));
    setHighlight(idx >= 0 ? idx : 0);
  }, [open, filtered, value]);

  const emit = (next) => {
    onChange?.({ target: { name, value: next } });
  };

  const pick = (opt) => {
    emit(opt.value);
    closeList({ restoreFocus: true });
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      closeList({ restoreFocus: true });
      return;
    }
    if (e.key === "Tab") {
      // Keep tab order in the form (portal unmount would drop focus to body).
      e.preventDefault();
      closeList({ tabShift: e.shiftKey });
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (filtered.length ? (h + 1) % filtered.length : -1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (filtered.length ? (h - 1 + filtered.length) % filtered.length : -1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (highlight >= 0 && filtered[highlight]) pick(filtered[highlight]);
    }
  };

  const display = selected?.label || placeholder;
  const isPlaceholder = !selected;
  const triggerClasses =
    variant === "pill"
      ? `${PILL_TRIGGER} ${triggerClassName}`.trim()
      : `${TRIGGER} ${triggerClassName}`.trim();

  return (
    <div ref={rootRef} className={`relative min-w-0 ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={triggerClasses}
        style={triggerStyle}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setOpen((o) => !o);
        }}
        onKeyDown={onKeyDown}
      >
        <span className={`min-w-0 flex-1 truncate ${isPlaceholder ? "text-secondary" : ""}`}>
          {display}
        </span>
        <FiChevronDown className="h-3.5 w-3.5 shrink-0 text-secondary" aria-hidden />
      </button>

      {open && rect && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={listRef}
              role="listbox"
              style={{
                position: "fixed",
                top: rect.top,
                left: rect.left,
                width: rect.width,
                zIndex: DROPDOWN_Z,
              }}
              className="overflow-hidden rounded-sm border border-border bg-card shadow-lg dark:shadow-black/40"
            >
              {searchable ? (
                <div className="border-b border-border p-1">
                  <input
                    ref={searchRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="Search…"
                    className="h-7 w-full rounded-sm border border-border bg-primary/[0.04] px-1.5 text-sm text-title outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:bg-primary/10"
                  />
                </div>
              ) : null}
              <ul className="max-h-52 overflow-auto py-0.5">
                {filtered.length === 0 ? (
                  <li className="px-2 py-1.5 text-sm text-secondary">No options</li>
                ) : (
                  filtered.map((opt, idx) => {
                    const active = String(opt.value) === String(value);
                    const hi = idx === highlight;
                    return (
                      <li key={String(opt.value)}>
                        <button
                          type="button"
                          role="option"
                          tabIndex={-1}
                          aria-selected={active}
                          className={`flex w-full px-2 py-1 text-left text-sm ${
                            active
                              ? "bg-primary text-white"
                              : hi
                                ? "bg-primary/20 text-title dark:bg-primary/30"
                                : "text-title hover:bg-primary/15 dark:hover:bg-primary/25"
                          }`}
                          onMouseEnter={() => setHighlight(idx)}
                          onMouseDown={(e) => {
                            // Keep focus in the control; don't let option steal it before portal closes.
                            e.preventDefault();
                          }}
                          onClick={() => pick(opt)}
                        >
                          {opt.label}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
