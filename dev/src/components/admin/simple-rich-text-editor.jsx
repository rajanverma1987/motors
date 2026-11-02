"use client";

import { useEffect, useRef } from "react";
import Button from "@/components/ui/button";

/**
 * Lightweight contentEditable HTML editor for admin marketing templates.
 * @param {{ value: string, onChange: (html: string) => void, className?: string, minHeight?: string }} props
 */
export default function SimpleRichTextEditor({
  value = "",
  onChange,
  className = "",
  minHeight = "14rem",
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
    ref.current?.focus();
    try {
      document.execCommand(command, false, arg);
    } catch {
      /* ignore */
    }
    emit();
  };

  const addLink = () => {
    const url = window.prompt("Link URL");
    if (!url) return;
    run("createLink", url.trim());
  };

  return (
    <div className={`overflow-hidden rounded-md border border-border bg-card ${className}`}>
      <div className="flex flex-wrap gap-1 border-b border-border bg-bg px-2 py-1.5">
        <Button type="button" size="sm" variant="outline" className="!min-h-8 !px-2 text-xs" onClick={() => run("bold")}>
          Bold
        </Button>
        <Button type="button" size="sm" variant="outline" className="!min-h-8 !px-2 text-xs" onClick={() => run("italic")}>
          Italic
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="!min-h-8 !px-2 text-xs"
          onClick={() => run("insertUnorderedList")}
        >
          List
        </Button>
        <Button type="button" size="sm" variant="outline" className="!min-h-8 !px-2 text-xs" onClick={addLink}>
          Link
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="!min-h-8 !px-2 text-xs"
          onClick={() => run("removeFormat")}
        >
          Clear
        </Button>
      </div>
      <div
        ref={ref}
        className="prose prose-sm max-w-none px-3 py-2 text-sm text-title outline-none dark:prose-invert"
        style={{ minHeight }}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        role="textbox"
        aria-multiline="true"
      />
    </div>
  );
}
