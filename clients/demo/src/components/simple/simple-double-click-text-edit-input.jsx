"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Textarea from "@/components/ui/textarea";

/**
 * Normal text input; double-click opens a larger textarea modal to edit/save.
 * Save uses type="button" (not form submit) so the event cannot bubble through the
 * React portal tree into a parent <form> (e.g. Datasheet) and save stale data.
 */
export default function SimpleDoubleClickTextEditInput({
  value = "",
  onChange,
  label = "Edit field",
  placeholder = "",
  className = "",
  disabled = false,
  rows = 8,
  zIndex = 160,
  inputMode,
  "aria-label": ariaLabel,
  ...rest
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const text = value == null ? "" : String(value);

  useEffect(() => {
    if (!open) return;
    setDraft(text);
  }, [open, text]);

  const openEditor = () => {
    if (disabled) return;
    setDraft(text);
    setOpen(true);
  };

  const closeEditor = () => {
    setOpen(false);
    setDraft("");
  };

  const handleSave = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    onChange?.(draft);
    closeEditor();
  };

  return (
    <>
      <input
        type="text"
        value={text}
        placeholder={placeholder}
        disabled={disabled}
        inputMode={inputMode}
        aria-label={ariaLabel || label}
        title={disabled ? undefined : "Double-click to edit in a larger box"}
        className={className}
        onChange={(e) => onChange?.(e.target.value)}
        onDoubleClick={(e) => {
          e.preventDefault();
          openEditor();
        }}
        {...rest}
      />

      <Modal
        open={open}
        onClose={closeEditor}
        title={label}
        size="md"
        zIndex={zIndex}
        actions={
          <Button type="button" variant="primary" size="sm" onClick={handleSave}>
            Save
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          <Textarea
            label={label}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={rows}
            placeholder={placeholder || "Enter value…"}
            textareaClassName="min-h-[10rem]"
          />
        </div>
      </Modal>
    </>
  );
}
