"use client";

import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useModalStack } from "@/components/modal-provider";

const BASE_Z = 50;
const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  full: "max-w-[90vw]",
};

function toCssValue(v) {
  if (v == null) return undefined;
  if (typeof v === "number") return `${v}px`;
  return String(v);
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  showClose = true,
  size = "md",
  width,
  height,
  className = "",
  /** Actions (e.g. Save) rendered in header right, before close. Use size="sm" buttons. */
  actions,
  /** Optional class on header row (e.g. flex-wrap). */
  headerClassName = "",
  /** Optional override so this modal appears above others (e.g. when opening a modal from another modal). */
  zIndex: zIndexOverride,
}) {
  const stackContext = useModalStack();
  const { addModal, removeModal } = stackContext || {};
  const [modalId, setModalId] = useState(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStartRef = useRef({ clientX: 0, clientY: 0, posX: 0, posY: 0 });
  const dialogRef = useRef(null);

  const handleHeaderMouseDown = (e) => {
    if (e.button !== 0) return;
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    setDragging(true);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const { clientX, clientY, posX, posY } = dragStartRef.current;
      let nextX = posX + e.clientX - clientX;
      let nextY = posY + e.clientY - clientY;

      if (dialogRef.current) {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const { width, height } = dialogRef.current.getBoundingClientRect();
        const minX = width / 2 - vw / 2;
        const maxX = vw / 2 - width / 2;
        const minY = height / 2 - vh / 2;
        const maxY = vh / 2 - height / 2;
        nextX = Math.max(minX, Math.min(maxX, nextX));
        nextY = Math.max(minY, Math.min(maxY, nextY));
      }

      setPosition({ x: nextX, y: nextY });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging]);

  useEffect(() => {
    if (!open) return;
    if (addModal && removeModal) {
      const id = addModal(onClose);
      setModalId(id);
      return () => {
        removeModal(id);
        setModalId(null);
      };
    }
    const handler = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, addModal, removeModal]);

  if (!open) return null;

  const style = {};
  const w = toCssValue(width);
  const h = toCssValue(height);
  if (w) style.width = w;
  if (h) style.height = h;

  const zIndex =
    zIndexOverride != null
      ? zIndexOverride
      : stackContext && modalId != null
        ? BASE_Z + stackContext.stack.findIndex((item) => item.id === modalId)
        : BASE_Z;

  const dialogStyle = {
    ...(Object.keys(style).length ? style : {}),
    transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
  };

  const modalContent = (
    <div
      className="fixed inset-0 p-4"
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        style={dialogStyle}
        className={`absolute left-1/2 top-1/2 w-full rounded-lg border border-border bg-card shadow-xl dark:shadow-2xl dark:shadow-black/40 flex flex-col max-h-[90vh] ${!w ? sizeClasses[size] ?? sizeClasses.md : ""} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {(title != null || showClose || actions) && (
          <div
            className={`flex min-h-11 min-w-0 flex-nowrap items-center gap-2 border-b border-border px-4 py-2 select-none sm:gap-3 ${dragging ? "cursor-grabbing" : "cursor-grab"} ${headerClassName}`.trim()}
            onMouseDown={handleHeaderMouseDown}
          >
            {title != null && (
              <h2
                id="modal-title"
                className="pointer-events-none max-w-[min(12rem,36vw)] shrink-0 self-center truncate text-lg font-semibold leading-snug text-title sm:max-w-[14rem] md:max-w-xs lg:max-w-sm"
              >
                {title}
              </h2>
            )}
            {actions != null ? (
              <div className="pointer-events-auto flex min-h-0 min-w-0 flex-1 items-center overflow-x-auto overscroll-x-contain [-ms-overflow-style:auto] [scrollbar-width:thin]">
                <div className="flex min-h-0 w-full min-w-0 flex-nowrap items-center justify-end gap-1 pr-1 sm:gap-1.5 [&>span]:inline-flex [&>span]:items-center [&_button]:inline-flex [&_button]:items-center">
                  {actions}
                </div>
              </div>
            ) : (
              <span className="min-w-0 flex-1" aria-hidden />
            )}
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                onMouseDown={(e) => e.stopPropagation()}
                className="inline-flex shrink-0 cursor-pointer items-center justify-center self-center rounded p-1.5 text-secondary hover:bg-bg hover:text-text focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-auto p-4">{children}</div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}
