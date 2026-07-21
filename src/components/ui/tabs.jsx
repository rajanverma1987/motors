"use client";

import { useState, useId, useCallback, useEffect, useRef } from "react";

/**
 * Tabs – segmented control for category navigation.
 * Warm Motop track + primary active pill (ui-ux-pro-max: clear focus, 150–200ms hover, high contrast).
 *
 * @param {Object} props
 * @param {{ id: string, label: string, children: React.ReactNode }[]} props.tabs
 * @param {string} [props.defaultTab]
 * @param {string} [props.value]
 * @param {(id: string) => void} [props.onChange]
 * @param {string} [props.className]
 * @param {string} [props.listClassName]
 * @param {string} [props.panelClassName]
 * @param {"segmented"|"pills"} [props.variant] – segmented (default) or legacy loose pills
 * @param {string} [props.ariaLabel]
 */
export default function Tabs({
  tabs = [],
  defaultTab,
  value,
  onChange,
  className = "",
  listClassName = "",
  panelClassName = "flex flex-col pt-6",
  variant = "segmented",
  ariaLabel = "Sections",
}) {
  const [internalValue, setInternalValue] = useState(defaultTab ?? tabs[0]?.id ?? "");
  const activeId = value !== undefined ? value : internalValue;
  const setActiveId = useCallback(
    (id) => {
      if (value === undefined) setInternalValue(id);
      onChange?.(id);
    },
    [onChange, value]
  );
  const uid = useId();
  const prevIndexRef = useRef(tabs.findIndex((t) => t.id === activeId));
  const [slideDir, setSlideDir] = useState(0); // -1 left, 1 right
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    const nextIndex = tabs.findIndex((t) => t.id === activeId);
    const prevIndex = prevIndexRef.current;
    if (nextIndex >= 0 && prevIndex >= 0 && nextIndex !== prevIndex) {
      setSlideDir(nextIndex > prevIndex ? 1 : -1);
      setAnimKey((k) => k + 1);
    }
    if (nextIndex >= 0) prevIndexRef.current = nextIndex;
  }, [activeId, tabs]);

  const onTabKeyDown = useCallback(
    (e, index) => {
      if (!tabs.length) return;
      let next = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        next = (index + 1) % tabs.length;
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        next = (index - 1 + tabs.length) % tabs.length;
      } else if (e.key === "Home") {
        next = 0;
      } else if (e.key === "End") {
        next = tabs.length - 1;
      }
      if (next == null) return;
      e.preventDefault();
      const id = tabs[next]?.id;
      if (!id) return;
      setActiveId(id);
      const el = document.getElementById(`${uid}-tab-${id}`);
      el?.focus();
    },
    [setActiveId, tabs, uid]
  );

  if (tabs.length === 0) return null;

  const isSegmented = variant !== "pills";
  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0];

  const listClass = isSegmented
    ? `flex w-full max-w-full flex-wrap gap-1 rounded-lg border border-border bg-[hsl(var(--form-bg))] p-1 dark:bg-card/60 ${listClassName}`
    : `inline-flex max-w-full flex-wrap gap-2 ${listClassName}`;

  const tabButtonBase = isSegmented
    ? "relative shrink-0 cursor-pointer rounded-md px-3.5 py-2 text-sm font-semibold tracking-tight transition-[color,background-color,box-shadow,transform] duration-200 ease-out motion-reduce:transition-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--bg))] sm:px-4"
    : "relative shrink-0 cursor-pointer rounded-sm px-4 py-2.5 text-sm font-semibold tracking-tight transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:px-5 sm:py-2.5 sm:text-base";

  const panelAnimClass =
    animKey === 0
      ? ""
      : slideDir < 0
        ? "ui-tab-panel-enter-left"
        : "ui-tab-panel-enter-right";

  return (
    <div className={`flex flex-col ${className}`}>
      <div role="tablist" aria-label={ariaLabel} className={listClass}>
        {tabs.map((tab, index) => {
          const isActive = activeId === tab.id;
          const activeClass = "bg-primary text-white shadow-sm";
          const idleClass = isSegmented
            ? "bg-transparent text-secondary hover:bg-card hover:text-title"
            : "bg-primary/15 text-primary hover:bg-primary/25";
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${uid}-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`${uid}-panel`}
              tabIndex={isActive ? 0 : -1}
              className={`${tabButtonBase} ${isActive ? activeClass : idleClass}`}
              onClick={() => setActiveId(tab.id)}
              onKeyDown={(e) => onTabKeyDown(e, index)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        key={`${activeTab?.id ?? "panel"}-${animKey}`}
        role="tabpanel"
        id={`${uid}-panel`}
        aria-labelledby={activeTab ? `${uid}-tab-${activeTab.id}` : undefined}
        className={`min-h-0 min-w-0 ${panelClassName} ${panelAnimClass}`}
        tabIndex={0}
      >
        {activeTab?.children ?? null}
      </div>
    </div>
  );
}
