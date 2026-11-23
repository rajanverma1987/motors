"use client";

import { useEffect, useRef } from "react";
import { FiBold, FiItalic, FiLink, FiList, FiUnderline } from "react-icons/fi";
import { MdFormatClear } from "react-icons/md";
import Button from "@/components/ui/button";

function FormatButton({ label, disabled, onClick, children }) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="!h-8 !min-h-8 !w-8 !px-0"
      disabled={disabled}
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

/**
 * Lightweight contentEditable HTML editor for email and marketing templates.
 * @param {{ value: string, onChange: (html: string) => void, className?: string, minHeight?: string, disabled?: boolean, id?: string }} props
 */
export default function SimpleRichTextEditor({
  value = "",
  onChange,
  className = "",
  minHeight = "14rem",
  disabled = false,
  id,
}) {
  const ref = useRef(null);
  const lastExternal = useRef("");

  useEffect(() => {
    if (!ref.current) return;
    if (value === lastExternal.current) return;
    if (ref.current.innerHTML === value) {
      lastExternal.current = value;
      return;
    }
    ref.current.innerHTML = value || "";
    lastExternal.current = value || "";
  }, [value]);

  const emit = () => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    lastExternal.current = html;
    onChange?.(html);
  };

  const run = (command, arg) => {
    if (disabled) return;
    ref.current?.focus();
    try {
      document.execCommand(command, false, arg);
    } catch {
      /* ignore */
    }
    emit();
  };

  const addLink = () => {
    if (disabled) return;
    const url = window.prompt("Link URL");
    if (!url) return;
    run("createLink", url.trim());
  };

  return (
    <div className={`overflow-hidden rounded-md border border-border bg-card ${className}`}>
      <div className="flex flex-wrap gap-1 border-b border-border bg-bg px-2 py-1.5" role="toolbar" aria-label="Email formatting">
        <FormatButton label="Bold" disabled={disabled} onClick={() => run("bold")}>
          <FiBold className="h-3.5 w-3.5" aria-hidden />
        </FormatButton>
        <FormatButton label="Italic" disabled={disabled} onClick={() => run("italic")}>
          <FiItalic className="h-3.5 w-3.5" aria-hidden />
        </FormatButton>
        <FormatButton label="Underline" disabled={disabled} onClick={() => run("underline")}>
          <FiUnderline className="h-3.5 w-3.5" aria-hidden />
        </FormatButton>
        <FormatButton label="List" disabled={disabled} onClick={() => run("insertUnorderedList")}>
          <FiList className="h-3.5 w-3.5" aria-hidden />
        </FormatButton>
        <FormatButton label="Link" disabled={disabled} onClick={addLink}>
          <FiLink className="h-3.5 w-3.5" aria-hidden />
        </FormatButton>
        <FormatButton label="Clear formatting" disabled={disabled} onClick={() => run("removeFormat")}>
          <MdFormatClear className="h-4 w-4" aria-hidden />
        </FormatButton>
      </div>
      <div
        id={id}
        ref={ref}
        className={`max-w-none px-3 py-2 text-sm leading-relaxed text-title outline-none [&_a]:text-primary [&_a]:underline [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
        style={{ minHeight }}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        role="textbox"
        aria-multiline="true"
        aria-disabled={disabled || undefined}
      />
    </div>
  );
}
