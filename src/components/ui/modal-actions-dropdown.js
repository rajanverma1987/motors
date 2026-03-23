"use client";

import { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { FiChevronDown } from "react-icons/fi";
import Button from "@/components/ui/button";

/**
 * Compact “Actions” control for modal headers: replaces a row of outline buttons with a dropdown menu.
 * If there is exactly one actionable item (ignoring dividers), renders that item as a plain outline button instead of a dropdown.
 * Menu is portaled to `document.body` with a high z-index so it stacks above modal chrome.
 *
 * @param {Object} props
 * @param {string} [props.label="Actions"]
 * @param {Array<{ key: string, label: React.ReactNode, icon?: React.ReactNode, onClick?: () => void, disabled?: boolean, title?: string, type?: "divider" }>} props.items
 * @param {"start"|"end"} [props.align="end"] horizontal alignment relative to trigger
 * @param {number} [props.menuZIndex=140]
 */
export default function ModalActionsDropdown({
  label = "Actions",
  items = [],
  align = "end",
  menuZIndex = 140,
  className = "",
  triggerClassName = "",
}) {
  const actionableItems = useMemo(
    () => items.filter((i) => i.type !== "divider"),
    [items]
  );
  const menuMode = actionableItems.length > 1;

  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, minW: 200 });
  const triggerWrapRef = useRef(null);
  const menuRef = useRef(null);

  useLayoutEffect(() => {
    if (!menuMode || !open || !triggerWrapRef.current) return;
    const r = triggerWrapRef.current.getBoundingClientRect();
    const minW = Math.max(200, r.width);
    let left = align === "end" ? r.right - minW : r.left;
    if (left + minW > window.innerWidth - 8) left = window.innerWidth - minW - 8;
    if (left < 8) left = 8;
    const top = r.bottom + 4;
    setCoords({ top, left, minW });
  }, [open, align, menuMode]);

  useEffect(() => {
    if (!menuMode || !open) return;
    const onDoc = (e) => {
      if (triggerWrapRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, menuMode]);

  if (actionableItems.length === 0) {
    return null;
  }

  /** One action → show a normal header button (no extra dropdown click). */
  if (actionableItems.length === 1) {
    const item = actionableItems[0];
    const labelText = typeof item.label === "string" ? item.label : undefined;
    return (
      <div className={`inline-flex shrink-0 ${className}`.trim()}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`!px-2 !py-0.5 !text-xs whitespace-nowrap inline-flex items-center gap-1.5 ${
            item.danger ? "!text-danger hover:!border-danger/50" : ""
          } ${triggerClassName}`.trim()}
          disabled={item.disabled}
          title={item.title}
          aria-label={labelText}
          onClick={(e) => {
            e.stopPropagation();
            if (item.disabled) return;
            item.onClick?.();
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {item.icon ? <span className="shrink-0 inline-flex items-center">{item.icon}</span> : null}
          <span className="min-w-0">{item.label}</span>
        </Button>
      </div>
    );
  }

  const menu =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={label}
            className="fixed max-h-[min(70vh,24rem)] overflow-y-auto rounded-lg border border-border bg-card py-1 shadow-lg ring-1 ring-black/5 dark:ring-white/10"
            style={{ zIndex: menuZIndex, top: coords.top, left: coords.left, minWidth: coords.minW }}
          >
            {items.map((item) => {
              if (item.type === "divider") {
                return <div key={item.key} className="my-1 border-t border-border" role="separator" />;
              }
              return (
                <button
                  key={item.key}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  title={item.title}
                  onClick={() => {
                    if (item.disabled) return;
                    item.onClick?.();
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-50 ${
                    item.danger
                      ? "text-danger hover:bg-danger/10"
                      : "text-title"
                  } ${item.itemClassName || ""}`.trim()}
                >
                  {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
                  <span className="min-w-0 flex-1">{item.label}</span>
                </button>
              );
            })}
          </div>,
          document.body
        )
      : null;

  return (
    <div className={`inline-flex shrink-0 ${className}`.trim()}>
      <div ref={triggerWrapRef} className="inline-flex">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`!px-2 !py-0.5 !text-xs whitespace-nowrap inline-flex items-center gap-1 ${triggerClassName}`.trim()}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {label}
          <FiChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </Button>
      </div>
      {menu}
    </div>
  );
}
