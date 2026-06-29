"use client";

import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useModalStack } from "@/components/modal-provider";

const BASE_Z = 110;
const STACK_STEP = 10;
const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-[33.6rem]",
  lg: "max-w-[38.4rem]",
  xl: "max-w-[43.2rem]",
  "2xl": "max-w-[50.4rem]",
  "3xl": "max-w-[57.6rem]",
  "4xl": "max-w-[67.2rem]",
  "5xl": "max-w-[76.8rem]",
  "6xl": "max-w-[86.4rem]",
  "7xl": "max-w-[96rem]",
  full: "max-w-[90vw]",
};

function toCssValue(v) {
  if (v == null) return undefined;
  if (typeof v === "number") return `${v}px`;
  return String(v);
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/** Visible, keyboard-focusable nodes inside a dialog (for Tab wrap). */
function getFocusableElements(container) {
  if (!container || typeof container.querySelectorAll !== "function") return [];
  const elements = Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR));
  return elements.filter((el) => {
    if (el.closest("[inert]") != null) return false;
    const style = window.getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") return false;
    if (el.getAttribute("aria-hidden") === "true") return false;
    return el.offsetParent !== null || style.position === "fixed";
  });
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
  /** @deprecated Ignored when ModalStackProvider is active — stack order sets z-index. */
  zIndex: zIndexOverride,
  /** Optional id on the outer portal wrapper (e.g. for print CSS targeting). */
  hostId,
}) {
  const stackContext = useModalStack();
  const { addModal, removeModal, getStackIndex } = stackContext || {};
  const [modalId, setModalId] = useState(null);
  const registeredIdRef = useRef(null);
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

  /** Move focus into the dialog when it opens; restore previous focus when it closes. */
  useLayoutEffect(() => {
    if (!open) return undefined;
    const root = dialogRef.current;
    if (!root) return undefined;
    const prev = document.activeElement;
    const nodes = getFocusableElements(root);
    if (nodes.length > 0) {
      nodes[0].focus({ preventScroll: true });
    } else {
      try {
        root.focus({ preventScroll: true });
      } catch {
        /* ignore */
      }
    }
    return () => {
      if (prev && typeof prev.focus === "function" && document.body.contains(prev)) {
        try {
          prev.focus({ preventScroll: true });
        } catch {
          /* ignore */
        }
      }
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return undefined;

    let registeredId = registeredIdRef.current;
    if (!registeredId && addModal) {
      registeredId = addModal(onClose);
      registeredIdRef.current = registeredId;
      setModalId(registeredId);
    }

    return () => {
      if (registeredIdRef.current != null && removeModal) {
        removeModal(registeredIdRef.current);
        registeredIdRef.current = null;
        setModalId(null);
      }
    };
  }, [open, onClose, addModal, removeModal]);

  useEffect(() => {
    if (!open) return undefined;

    const activeId = registeredIdRef.current ?? modalId;

    const isTopModal = () => {
      if (!activeId || !stackContext?.stack?.length) return true;
      return stackContext.stack[stackContext.stack.length - 1].id === activeId;
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (!addModal) {
          onClose();
        }
        return;
      }
      if (e.key !== "Tab") return;
      if (!isTopModal()) return;

      const root = dialogRef.current;
      if (!root) return;
      if (!root.contains(document.activeElement)) return;

      const nodes = getFocusableElements(root);
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [open, onClose, addModal, modalId, stackContext?.stack]);

  if (!open) return null;

  const style = {};
  const w = toCssValue(width);
  const h = toCssValue(height);
  if (w) style.width = w;
  if (h) style.height = h;

  const activeId = registeredIdRef.current ?? modalId;
  const stackIndex =
    stackContext && getStackIndex && activeId != null ? getStackIndex(activeId) : 0;

  const zIndex =
    stackContext && activeId != null
      ? BASE_Z + stackIndex * STACK_STEP
      : zIndexOverride ?? BASE_Z;

  const dialogStyle = {
    ...(Object.keys(style).length ? style : {}),
    transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
  };

  const modalContent = (
    <div
      id={hostId ?? undefined}
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
        tabIndex={-1}
        style={dialogStyle}
        className={`absolute left-1/2 top-1/2 w-full min-w-0 rounded-lg border border-border bg-card shadow-xl dark:shadow-2xl dark:shadow-black/40 flex flex-col max-h-[90vh] outline-none focus-visible:outline-none ${!w ? sizeClasses[size] ?? sizeClasses.md : ""} ${className}`}
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
                <div className="flex min-h-0 w-full min-w-0 flex-nowrap items-center justify-end gap-1 pr-1 sm:gap-1.5 [&>span]:inline-flex [&>span]:items-center [&_button]:inline-flex [&_button]:cursor-pointer [&_button]:items-center [&_button:disabled]:cursor-not-allowed">
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
        <div className="flex-1 min-h-0 w-full min-w-0 overflow-auto p-4">{children}</div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(modalContent, document.body);
}
