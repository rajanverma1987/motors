"use client";

import { useState, useRef, useEffect } from "react";
import HelpIcon from "./help-icon";

export default function Select({
  label,
  help,
  id,
  options = [],
  value,
  onChange,
  name,
  className = "",
  multiple = false,
  searchable = true,
  placeholder = "Select...",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef(null);

  const selectedValues = multiple
    ? Array.isArray(value) ? value : value ? [value] : []
    : value ?? "";

  const filteredOptions = searchable && searchQuery.trim()
    ? options.filter(
        (opt) =>
          opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  const selectedLabels = multiple
    ? options
        .filter((opt) => selectedValues.includes(opt.value))
        .map((opt) => opt.label)
    : (selectedValues && options.find((opt) => opt.value === selectedValues)?.label) ?? "";

  const displayText = multiple
    ? selectedLabels.length > 0
      ? selectedLabels.join(", ")
      : placeholder
    : selectedLabels || placeholder;

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (opt) => {
    if (multiple) {
      const next = selectedValues.includes(opt.value)
        ? selectedValues.filter((v) => v !== opt.value)
        : [...selectedValues, opt.value];
      onChange({ target: { name, value: next } });
    } else {
      onChange({ target: { name, value: opt.value } });
      setIsOpen(false);
      setSearchQuery("");
    }
  };

  const isSelected = (opt) =>
    multiple ? selectedValues.includes(opt.value) : selectedValues === opt.value;

  const handleRemove = (val, e) => {
    e.stopPropagation();
    const next = selectedValues.filter((v) => v !== val);
    onChange({ target: { name, value: next } });
  };

  const triggerContent = multiple && selectedValues.length > 0 ? (
    <div className="flex flex-1 flex-wrap gap-2 min-w-0 py-0.5">
      {selectedValues.map((val) => {
        const opt = options.find((o) => o.value === val);
        const label = opt?.label ?? String(val);
        return (
          <span
            key={val}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-bg px-2 py-1 text-sm text-text"
          >
            {label}
            <button
              type="button"
              onClick={(e) => handleRemove(val, e)}
              className="flex shrink-0 rounded p-0.5 hover:bg-card focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label={`Remove ${label}`}
            >
              <svg className="h-3.5 w-3.5 text-secondary hover:text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        );
      })}
    </div>
  ) : (
    <span className={selectedLabels ? "text-text" : "text-secondary"}>
      {displayText}
    </span>
  );

  return (
    <div ref={containerRef} className={`relative flex flex-col gap-1 ${className}`}>
      {label && (
        <span className="inline-flex items-center gap-1.5 text-sm text-title">
          {label}
          <HelpIcon text={help} />
        </span>
      )}
      <div
        id={id}
        role="button"
        tabIndex={0}
        onClick={() => {
          setIsOpen((o) => !o);
          setSearchQuery("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((o) => !o);
            setSearchQuery("");
          }
        }}
        className="flex w-full min-h-[2.5rem] cursor-pointer items-center justify-between gap-2 rounded-md border border-border bg-bg px-3 py-2 text-left text-text focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {triggerContent}
        <svg
          className={`h-4 w-4 shrink-0 text-secondary transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isOpen && (
        <div className="absolute top-full z-[100] mt-1 w-full rounded-md border border-border bg-bg shadow-lg">
          {searchable && (
            <div className="border-b border-border p-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          )}
          <ul className="max-h-48 overflow-auto py-1">
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-title">No options</li>
            ) : (
              filteredOptions.map((opt, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-bg ${
                      isSelected(opt) ? "bg-bg text-primary font-medium" : "text-text"
                    }`}
                  >
                    {multiple && (
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border ${
                          isSelected(opt) ? "bg-primary border-primary" : "bg-card"
                        }`}
                      >
                        {isSelected(opt) && (
                          <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                    )}
                    {opt.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
