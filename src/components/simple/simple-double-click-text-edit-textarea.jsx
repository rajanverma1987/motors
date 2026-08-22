"use client";

import { useEffect, useId, useState } from "react";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import Textarea from "@/components/ui/textarea";

/**
 * Normal textarea; double-click opens a larger textarea modal to edit/save.
 */
export default function SimpleDoubleClickTextEditTextarea({
  value = "",
  onChange,
  label = "Edit field",
  placeholder = "",
  className = "",
  disabled = false,
  rows = 2,
  modalRows = 8,
  zIndex = 160,
  "aria-label": ariaLabel,
  ...rest
}) {
  const uid = useId();
  const formId = `dbl-edit-textarea-${uid.replace(/:/g, "")}`;
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
    onChange?.(draft);
    closeEditor();
  };

  return (
    <>
      <textarea
        value={text}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
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
          <Button type="submit" form={formId} variant="primary" size="sm">
            Save
          </Button>
        }
      >
        <form id={formId} onSubmit={handleSave} className="flex flex-col gap-3">
          <Textarea
            label={label}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={modalRows}
            placeholder={placeholder || "Enter value…"}
            textareaClassName="min-h-[10rem]"
          />
        </form>
      </Modal>
    </>
  );
}
