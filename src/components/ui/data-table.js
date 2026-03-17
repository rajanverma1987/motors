"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Access-style editable data table.
 * - Inline editing, tab navigation, auto-add new row when editing last row.
 * - Small cross icon per row to delete that row.
 * - Calculated columns (formula receives row), full dataset returned via onChange.
 * - Uses theme tokens (border-border, bg-card, text-text).
 */
function getRowsFromData(data, columns) {
  const source = Array.isArray(data) ? data : [];
  const editableKeys = columns.filter((c) => !c.calculated).map((c) => c.key);
  const isBlank = (row) =>
    editableKeys.every(
      (k) => row[k] == null || String(row[k]).trim() === ""
    );
  const lastIsBlank = source.length > 0 && isBlank(source[source.length - 1]);
  const rows = lastIsBlank && source.length > 0 ? [...source] : [...source, {}];
  const calculatedCols = columns.filter((c) => c.calculated && typeof c.formula === "function");
  if (calculatedCols.length === 0) return rows;
  return rows.map((row) => {
    const r = { ...row };
    calculatedCols.forEach((col) => {
      r[col.key] = col.formula(r);
    });
    return r;
  });
}

export default function DataTable({ columns = [], data = [], onChange, striped = false }) {
  const [rows, setRows] = useState(() => getRowsFromData(data, columns));
  const tableRef = useRef(null);

  useEffect(() => {
    setRows(getRowsFromData(data, columns));
  }, [data]);

  const editableKeys = columns.filter((c) => !c.calculated).map((c) => c.key);
  const lastRowIndex = rows.length - 1;

  function isBlankRow(row) {
    return editableKeys.every(
      (k) => row[k] == null || String(row[k]).trim() === ""
    );
  }

  function updateRow(rowIndex, key, value) {
    const updated = rows.map((r, i) =>
      i === rowIndex ? { ...r, [key]: value } : { ...r }
    );

    columns.forEach((col) => {
      if (col.calculated && col.formula) {
        updated[rowIndex][col.key] = col.formula(updated[rowIndex]);
      }
    });

    if (rowIndex === rows.length - 1) {
      updated.push({});
    }

    setRows(updated);
    if (onChange) {
      const withoutBlankRows = updated.filter((row) => !isBlankRow(row));
      onChange(withoutBlankRows);
    }
  }

  function removeRow(rowIndex) {
    if (rowIndex >= lastRowIndex) return;
    const updated = rows.filter((_, i) => i !== rowIndex);
    setRows(updated);
    if (onChange) {
      const withoutBlankRows = updated.filter((row) => !isBlankRow(row));
      onChange(withoutBlankRows);
    }
  }

  function handleKeyDown(e, rowIndex, colIndex) {
    const editableCols = columns.filter((c) => !c.calculated);
    const colIdx = editableCols.findIndex((c, i) => i === colIndex);
    if (colIdx < 0) return;

    if (e.key === "Tab" && !e.shiftKey) {
      if (colIdx < editableCols.length - 1) {
        e.preventDefault();
        const next = tableRef.current?.querySelector(
          `[data-cell="${rowIndex}-${colIdx + 1}"]`
        );
        next?.focus();
      } else if (rowIndex < rows.length - 1) {
        e.preventDefault();
        const next = tableRef.current?.querySelector(`[data-cell="${rowIndex + 1}-0"]`);
        next?.focus();
      }
    } else if (e.key === "Tab" && e.shiftKey) {
      if (colIdx > 0) {
        e.preventDefault();
        const prev = tableRef.current?.querySelector(
          `[data-cell="${rowIndex}-${colIdx - 1}"]`
        );
        prev?.focus();
      } else if (rowIndex > 0) {
        e.preventDefault();
        const lastColIdx = editableCols.length - 1;
        const prev = tableRef.current?.querySelector(
          `[data-cell="${rowIndex - 1}-${lastColIdx}"]`
        );
        prev?.focus();
      }
    }
  }

  const editableColumns = columns.filter((c) => !c.calculated);

  function getColStyle(col) {
    if (!col.width && !col.minWidth && !col.maxWidth) return undefined;
    const style = {};
    if (col.width != null) style.width = typeof col.width === "number" ? `${col.width}px` : col.width;
    if (col.minWidth != null) style.minWidth = typeof col.minWidth === "number" ? `${col.minWidth}px` : col.minWidth;
    if (col.maxWidth != null) style.maxWidth = typeof col.maxWidth === "number" ? `${col.maxWidth}px` : col.maxWidth;
    return Object.keys(style).length ? style : undefined;
  }

  const deleteIcon = (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table ref={tableRef} className="w-full table-fixed">
        <thead className="border-b border-border bg-card">
          <tr>
            {columns.map((col, i) => (
              <th
                key={col.key ?? i}
                className="px-3 py-2 text-left text-xs font-medium text-title"
                style={getColStyle(col)}
              >
                {col.label}
              </th>
            ))}
            <th className="w-9 px-1 py-1.5" aria-label="Delete row" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className={`h-8 border-b border-border last:border-b-0 ${striped && rowIndex % 2 === 1 ? "bg-card" : ""}`}
            >
              {columns.map((col, colIndex) => {
                if (col.calculated) {
                  const value = row[col.key];
                  const display =
                    col.type === "number" && value !== "" && value != null
                      ? Number(value).toLocaleString()
                      : value ?? "";
                  return (
                    <td
                      key={col.key ?? colIndex}
                      className="px-2 py-0 text-sm text-text tabular-nums align-middle h-8"
                      style={getColStyle(col)}
                    >
                      {display}
                    </td>
                  );
                }

                const editableIdx = editableColumns.findIndex((c) => c.key === col.key);
                const options = col.options;
                const isSelect = options && Array.isArray(options) && options.length > 0;
                const inputType = col.type === "number" ? "number" : "text";

                const inputClass =
                  "min-w-0 h-full min-h-0 rounded-none border-0 border-border bg-bg px-2 py-0 text-sm text-text placeholder:text-secondary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors [box-sizing:border-box]";
                const fullWidthStyle = { width: "100%", minWidth: 0, boxSizing: "border-box", height: "100%" };

                if (isSelect) {
                  const normalizedOptions = options.map((opt) =>
                    typeof opt === "string"
                      ? { value: opt, label: opt }
                      : { value: opt.value, label: opt.label ?? opt.value }
                  );
                  return (
                    <td key={col.key ?? colIndex} className="p-0 align-middle min-w-0 h-8" style={getColStyle(col)}>
                      <div className="block w-full min-w-0 h-full" style={fullWidthStyle}>
                        <select
                          data-cell={`${rowIndex}-${editableIdx}`}
                          value={row[col.key] ?? ""}
                          onChange={(e) =>
                            updateRow(rowIndex, col.key, e.target.value)
                          }
                          onKeyDown={(e) => handleKeyDown(e, rowIndex, editableIdx)}
                          className={`${inputClass} cursor-pointer border border-border`}
                          style={fullWidthStyle}
                          aria-label={`${col.label} row ${rowIndex + 1}`}
                        >
                          {col.placeholder !== false && (
                            <option value="">{col.placeholder ?? "Select..."}</option>
                          )}
                          {normalizedOptions.map((opt, i) => (
                            <option key={i} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  );
                }

                const inputPlaceholder =
                  col.placeholder != null && col.placeholder !== false ? String(col.placeholder) : undefined;

                return (
                  <td key={col.key ?? colIndex} className="p-0 align-middle min-w-0 h-8" style={getColStyle(col)}>
                    <div className="block w-full min-w-0 h-full" style={fullWidthStyle}>
                      <input
                        type={inputType}
                        data-cell={`${rowIndex}-${editableIdx}`}
                        value={row[col.key] ?? ""}
                        onChange={(e) =>
                          updateRow(rowIndex, col.key, e.target.value)
                        }
                        onKeyDown={(e) => handleKeyDown(e, rowIndex, editableIdx)}
                        placeholder={inputPlaceholder}
                        style={fullWidthStyle}
                        className={`${inputClass} border border-border tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                        aria-label={`${col.label} row ${rowIndex + 1}`}
                      />
                    </div>
                  </td>
                );
              })}
              <td className="w-9 px-1 py-0 align-middle h-8">
                {rowIndex < lastRowIndex ? (
                  <button
                    type="button"
                    onClick={() => removeRow(rowIndex)}
                    aria-label={`Delete row ${rowIndex + 1}`}
                    className="flex h-7 w-7 items-center justify-center rounded text-secondary hover:bg-card hover:text-text focus:outline-none focus:ring-2 focus:ring-primary focus:ring-inset"
                  >
                    {deleteIcon}
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
