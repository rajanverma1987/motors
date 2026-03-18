"use client";

import { useState, useId } from "react";

const tabButtonBase =
  "relative shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-t";

/**
 * Tabs – horizontal tab list with panels. Use for category navigation.
 *
 * @param {Object} props
 * @param {{ id: string, label: string, children: React.ReactNode }[]} props.tabs – list of { id, label, children }
 * @param {string} [props.defaultTab] – initial active tab id (default: first tab)
 * @param {string} [props.value] – controlled active tab id
 * @param {(id: string) => void} [props.onChange] – called when tab changes (for controlled use)
 * @param {string} [props.className] – extra class on the root wrapper
 * @param {string} [props.listClassName] – extra class on the tab list
 */
export default function Tabs({
  tabs = [],
  defaultTab,
  value,
  onChange,
  className = "",
  listClassName = "",
}) {
  const [internalValue, setInternalValue] = useState(defaultTab ?? tabs[0]?.id ?? "");
  const activeId = value !== undefined ? value : internalValue;
  const setActiveId = (id) => {
    if (value === undefined) setInternalValue(id);
    onChange?.(id);
  };
  const uid = useId();

  if (tabs.length === 0) return null;

  return (
    <div className={`flex flex-col ${className}`}>
      <div
        role="tablist"
        aria-label="Settings categories"
        className={`flex flex-wrap gap-x-1 border-b border-border ${listClassName}`}
      >
        {tabs.map((tab) => {
          const isActive = activeId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${uid}-tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`${uid}-panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              className={
                isActive
                  ? `${tabButtonBase} border-primary text-primary`
                  : `${tabButtonBase} border-transparent text-secondary hover:text-title hover:border-border`
              }
              onClick={() => setActiveId(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => {
        const isActive = activeId === tab.id;
        return (
          <div
            key={tab.id}
            role="tabpanel"
            id={`${uid}-panel-${tab.id}`}
            aria-labelledby={`${uid}-tab-${tab.id}`}
            hidden={!isActive}
            className="flex flex-col pt-6"
          >
            {isActive ? tab.children : null}
          </div>
        );
      })}
    </div>
  );
}
