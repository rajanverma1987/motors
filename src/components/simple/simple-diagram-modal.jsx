"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  FiArrowLeft,
  FiDownload,
  FiEdit2,
  FiMaximize,
  FiMove,
  FiPlus,
  FiRotateCcw,
  FiSquare,
  FiTrash2,
  FiZoomIn,
} from "react-icons/fi";
import { BiEraser } from "react-icons/bi";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import { normalizeJobDiagram, normalizeJobDiagrams } from "@/lib/diagram-templates-shared";

const CANVAS_W = 1400;
const CANVAS_H = 1000;
const PEN_COLORS = ["#111827", "#dc2626", "#2563eb", "#16a34a", "#ca8a04", "#7c3aed", "#ea580c"];
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 4;
const TOOL_PEN = "pen";
const TOOL_ERASER = "eraser";
const TOOL_SELECT = "select";
const MODE_DRAW = "draw";
const MODE_ZOOM = "zoom";
const MIN_SELECT_PX = 4;

function clampZoom(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(n * 100) / 100));
}

function pointerDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function pointerMidpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function normalizeRect(a, b) {
  const x1 = Math.min(a.x, b.x);
  const y1 = Math.min(a.y, b.y);
  const x2 = Math.max(a.x, b.x);
  const y2 = Math.max(a.y, b.y);
  return {
    x: Math.max(0, Math.min(CANVAS_W, x1)),
    y: Math.max(0, Math.min(CANVAS_H, y1)),
    w: Math.max(0, Math.min(CANVAS_W, x2) - Math.max(0, Math.min(CANVAS_W, x1))),
    h: Math.max(0, Math.min(CANVAS_H, y2) - Math.max(0, Math.min(CANVAS_H, y1))),
  };
}

function selectionHasArea(sel) {
  return Boolean(sel && sel.w >= MIN_SELECT_PX && sel.h >= MIN_SELECT_PX);
}

/**
 * Full-height modal: list job diagrams, pick a blank design, draw, save (multiple per job).
 */
export default function SimpleDiagramModal({
  open,
  onClose,
  recordId,
  jobDiagrams,
  /** @deprecated Prefer jobDiagrams */
  jobDiagram,
  onSaved,
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [step, setStep] = useState("list"); // list | pick | draw | view
  const [diagrams, setDiagrams] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null); // { id, name, imageUrl } | blank
  const [saving, setSaving] = useState(false);
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [penSize, setPenSize] = useState(3);
  const [tool, setTool] = useState(TOOL_PEN);
  const [selection, setSelection] = useState(null);
  const [canvasMode, setCanvasMode] = useState(MODE_DRAW);
  const [zoom, setZoom] = useState(1);
  const [fitSize, setFitSize] = useState({ w: CANVAS_W, h: CANVAS_H });
  const [printRoot, setPrintRoot] = useState(null);
  /** When set, save replaces this diagram id; empty string means create new. */
  const [editingDiagramId, setEditingDiagramId] = useState("");

  const canvasRef = useRef(null);
  const viewportRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPtRef = useRef(null);
  const strokeStackRef = useRef([]);
  const currentStrokeRef = useRef(null);
  const selectStartRef = useRef(null);
  const bgImageRef = useRef(null);
  /** True when canvas background is a previously saved job diagram (baked image). */
  const editingSavedRef = useRef(false);
  const zoomRef = useRef(1);
  const fitSizeRef = useRef({ w: CANVAS_W, h: CANVAS_H });
  const canvasModeRef = useRef(MODE_DRAW);
  const activePointersRef = useRef(new Map());
  const gestureRef = useRef(null);
  const pendingScrollRef = useRef(null);

  const active = normalizeJobDiagram(diagrams.find((d) => d.id === activeId) || null);

  const syncDiagramsFromProps = useCallback(() => {
    const list = normalizeJobDiagrams(jobDiagrams, jobDiagram);
    setDiagrams(list);
    return list;
  }, [jobDiagrams, jobDiagram]);

  const resetDrawState = useCallback(() => {
    drawingRef.current = false;
    lastPtRef.current = null;
    strokeStackRef.current = [];
    currentStrokeRef.current = null;
    selectStartRef.current = null;
    bgImageRef.current = null;
    editingSavedRef.current = false;
    activePointersRef.current.clear();
    gestureRef.current = null;
    pendingScrollRef.current = null;
    setSelection(null);
    setTool(TOOL_PEN);
    setCanvasMode(MODE_DRAW);
    setZoom(1);
  }, []);

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
      const res = await fetch(`/api/dashboard/diagram-templates${qs}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load designs");
      setTemplates(Array.isArray(data.items) ? data.items.filter((t) => t.isActive !== false) : []);
    } catch (err) {
      toast.error(err.message || "Could not load designs");
      setTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  }, [q, toast]);

  useEffect(() => {
    if (!open) return;
    resetDrawState();
    const list = syncDiagramsFromProps();
    setActiveId("");
    setEditingDiagramId("");
    setSelected(null);
    setQ("");
    if (list.length) {
      setStep("list");
    } else {
      setStep("pick");
      void loadTemplates();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps -- init on open only

  useEffect(() => {
    if (!open) return;
    const list = syncDiagramsFromProps();
    setDiagrams(list);
  }, [open, syncDiagramsFromProps]);

  useEffect(() => {
    if (!open || step !== "pick") return;
    const t = setTimeout(() => void loadTemplates(), 200);
    return () => clearTimeout(t);
  }, [q, open, step, loadTemplates]);

  useEffect(() => {
    if (step === "draw") {
      setZoom(1);
      setSelection(null);
      setTool(TOOL_PEN);
      setCanvasMode(MODE_DRAW);
      activePointersRef.current.clear();
      gestureRef.current = null;
    }
  }, [step]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    fitSizeRef.current = fitSize;
  }, [fitSize]);

  useEffect(() => {
    canvasModeRef.current = canvasMode;
  }, [canvasMode]);

  const applyZoomAroundClientPoint = useCallback((clientX, clientY, nextZoom) => {
    const viewport = viewportRef.current;
    if (!viewport) {
      setZoom(clampZoom(nextZoom));
      return;
    }
    const oldZoom = zoomRef.current || 1;
    const fit = fitSizeRef.current;
    const clamped = clampZoom(nextZoom);
    if (clamped === oldZoom) return;

    const rect = viewport.getBoundingClientRect();
    const focalX = clientX - rect.left;
    const focalY = clientY - rect.top;
    const oldW = Math.max(1, fit.w * oldZoom);
    const oldH = Math.max(1, fit.h * oldZoom);
    const ratioX = (viewport.scrollLeft + focalX) / oldW;
    const ratioY = (viewport.scrollTop + focalY) / oldH;

    pendingScrollRef.current = { ratioX, ratioY, focalX, focalY };
    zoomRef.current = clamped;
    setZoom(clamped);
  }, []);

  useLayoutEffect(() => {
    const pending = pendingScrollRef.current;
    if (!pending) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const fit = fitSizeRef.current;
    const z = zoomRef.current || 1;
    const newW = Math.max(1, fit.w * z);
    const newH = Math.max(1, fit.h * z);
    viewport.scrollLeft = pending.ratioX * newW - pending.focalX;
    viewport.scrollTop = pending.ratioY * newH - pending.focalY;
    pendingScrollRef.current = null;
  }, [zoom, fitSize]);

  useLayoutEffect(() => {
    if (!open || step !== "draw") return undefined;
    const el = viewportRef.current;
    if (!el) return undefined;
    const updateFit = () => {
      const pad = 8;
      const availW = Math.max(el.clientWidth - pad, 80);
      const availH = Math.max(el.clientHeight - pad, 80);
      const scale = Math.min(availW / CANVAS_W, availH / CANVAS_H);
      setFitSize({
        w: Math.max(1, Math.floor(CANVAS_W * scale)),
        h: Math.max(1, Math.floor(CANVAS_H * scale)),
      });
    };
    updateFit();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateFit) : null;
    ro?.observe(el);
    window.addEventListener("resize", updateFit);

    const onWheel = (e) => {
      if (canvasModeRef.current !== MODE_ZOOM) return;
      e.preventDefault();
      const direction = e.deltaY < 0 ? 1 : -1;
      const factor = direction > 0 ? 1.08 : 1 / 1.08;
      applyZoomAroundClientPoint(e.clientX, e.clientY, (zoomRef.current || 1) * factor);
    };

    const onTouchMove = (e) => {
      if (canvasModeRef.current === MODE_DRAW && e.touches && e.touches.length > 1) {
        e.preventDefault();
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", updateFit);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, [open, step, applyZoomAroundClientPoint]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    const bg = bgImageRef.current;
    if (bg) {
      const scale = Math.min(CANVAS_W / bg.width, CANVAS_H / bg.height);
      const w = bg.width * scale;
      const h = bg.height * scale;
      const x = (CANVAS_W - w) / 2;
      const y = (CANVAS_H - h) / 2;
      ctx.drawImage(bg, x, y, w, h);
    }
    for (const op of strokeStackRef.current) {
      if (op?.type === "eraseRect") {
        paintEraseRect(ctx, op);
      } else {
        paintStroke(ctx, op);
      }
    }
  }, []);

  const startDrawWithTemplate = useCallback(
    async (tpl) => {
      resetDrawState();
      editingSavedRef.current = false;
      setSelected(tpl);
      setStep("draw");
      setTool(TOOL_PEN);

      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = CANVAS_W;
      canvas.height = CANVAS_H;

      if (tpl?.imageUrl) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = tpl.imageUrl;
          });
          bgImageRef.current = img;
        } catch {
          toast.error("Could not load design image. Drawing on blank paper.");
          bgImageRef.current = null;
        }
      }
      redraw();
    },
    [redraw, resetDrawState, toast]
  );

  const openAddDiagram = () => {
    setEditingDiagramId("");
    setActiveId("");
    setSelected(null);
    resetDrawState();
    setStep("pick");
    void loadTemplates();
  };

  const openViewDiagram = (diagram) => {
    const d = normalizeJobDiagram(diagram);
    if (!d?.url) return;
    setActiveId(d.id);
    setEditingDiagramId(d.id);
    setStep("view");
  };

  const startEditSaved = useCallback(async () => {
    const saved = active;
    if (!saved?.url) return;
    resetDrawState();
    editingSavedRef.current = true;
    setEditingDiagramId(saved.id);
    setSelected({
      id: saved.templateId || "",
      name: saved.templateName || "Saved diagram",
      imageUrl: "",
    });
    setStep("draw");

    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = `${saved.url}${saved.url.includes("?") ? "&" : "?"}t=${Date.now()}`;
      });
      bgImageRef.current = img;
    } catch {
      toast.error("Could not load saved diagram.");
      setStep("view");
      return;
    }
    redraw();
  }, [active, redraw, resetDrawState, toast]);

  const canvasPoint = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
      pressure: typeof e.pressure === "number" && e.pressure > 0 ? e.pressure : 0.5,
    };
  };

  const chooseTool = (nextTool) => {
    setCanvasMode(MODE_DRAW);
    setTool(nextTool);
    if (nextTool !== TOOL_SELECT) setSelection(null);
    selectStartRef.current = null;
    drawingRef.current = false;
    currentStrokeRef.current = null;
    activePointersRef.current.clear();
    gestureRef.current = null;
  };

  const chooseCanvasMode = (mode) => {
    setCanvasMode(mode);
    drawingRef.current = false;
    currentStrokeRef.current = null;
    selectStartRef.current = null;
    activePointersRef.current.clear();
    gestureRef.current = null;
    if (mode === MODE_ZOOM) {
      setSelection(null);
    }
  };

  const handleFitView = () => {
    pendingScrollRef.current = null;
    setZoom(1);
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
    }
  };

  const handleDeleteSelection = useCallback(() => {
    if (!selectionHasArea(selection)) return;
    strokeStackRef.current.push({
      type: "eraseRect",
      x: selection.x,
      y: selection.y,
      w: selection.w,
      h: selection.h,
    });
    setSelection(null);
    selectStartRef.current = null;
    redraw();
  }, [redraw, selection]);

  useEffect(() => {
    if (step !== "draw") return undefined;
    const onKeyDown = (e) => {
      const tag = String(e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target?.isContentEditable) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectionHasArea(selection)) {
        e.preventDefault();
        handleDeleteSelection();
      }
      if (e.key === "Escape") {
        setSelection(null);
        selectStartRef.current = null;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [step, selection, handleDeleteSelection]);

  const onZoomPointerDown = (e) => {
    if (canvasMode !== MODE_ZOOM || step !== "draw") return;
    e.preventDefault();
    const viewport = viewportRef.current;
    if (!viewport) return;
    try {
      viewport.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = Array.from(activePointersRef.current.values());
    if (pts.length >= 2) {
      const [a, b] = pts;
      gestureRef.current = {
        type: "pinch",
        startDist: Math.max(pointerDistance(a, b), 1),
        startZoom: zoomRef.current || 1,
      };
    } else {
      gestureRef.current = {
        type: "pan",
        lastX: e.clientX,
        lastY: e.clientY,
      };
    }
  };

  const onZoomPointerMove = (e) => {
    if (canvasMode !== MODE_ZOOM || step !== "draw") return;
    if (!activePointersRef.current.has(e.pointerId)) return;
    e.preventDefault();
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = Array.from(activePointersRef.current.values());
    const gesture = gestureRef.current;
    const viewport = viewportRef.current;
    if (!viewport || !gesture) return;

    if (pts.length >= 2) {
      const [a, b] = pts;
      const mid = pointerMidpoint(a, b);
      const dist = Math.max(pointerDistance(a, b), 1);
      if (gesture.type !== "pinch") {
        gestureRef.current = {
          type: "pinch",
          startDist: dist,
          startZoom: zoomRef.current || 1,
        };
        return;
      }
      const nextZoom = gesture.startZoom * (dist / gesture.startDist);
      applyZoomAroundClientPoint(mid.x, mid.y, nextZoom);
      return;
    }

    if (gesture.type === "pan") {
      const dx = e.clientX - gesture.lastX;
      const dy = e.clientY - gesture.lastY;
      viewport.scrollLeft -= dx;
      viewport.scrollTop -= dy;
      gesture.lastX = e.clientX;
      gesture.lastY = e.clientY;
    }
  };

  const onZoomPointerUp = (e) => {
    if (!activePointersRef.current.has(e.pointerId)) return;
    activePointersRef.current.delete(e.pointerId);
    try {
      viewportRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const pts = Array.from(activePointersRef.current.values());
    if (pts.length >= 2) {
      const [a, b] = pts;
      gestureRef.current = {
        type: "pinch",
        startDist: Math.max(pointerDistance(a, b), 1),
        startZoom: zoomRef.current || 1,
      };
    } else if (pts.length === 1) {
      gestureRef.current = {
        type: "pan",
        lastX: pts[0].x,
        lastY: pts[0].y,
      };
    } else {
      gestureRef.current = null;
    }
  };

  const onPointerDown = (e) => {
    if (step !== "draw" || canvasMode !== MODE_DRAW) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const pt = canvasPoint(e);
    if (!pt) return;

    if (tool === TOOL_SELECT) {
      drawingRef.current = true;
      selectStartRef.current = pt;
      setSelection({ x: pt.x, y: pt.y, w: 0, h: 0 });
      return;
    }

    drawingRef.current = true;
    lastPtRef.current = pt;
    const isEraser = tool === TOOL_ERASER;
    const stroke = {
      color: isEraser ? "#ffffff" : penColor,
      size: isEraser ? Math.max(penSize * 4, 12) : penSize,
      eraser: isEraser,
      points: [pt],
    };
    currentStrokeRef.current = stroke;
    strokeStackRef.current.push(stroke);
    const ctx = canvas.getContext("2d");
    if (ctx) paintStroke(ctx, stroke);
  };

  const onPointerMove = (e) => {
    if (!drawingRef.current || step !== "draw" || canvasMode !== MODE_DRAW) return;
    e.preventDefault();
    const pt = canvasPoint(e);
    if (!pt) return;

    if (tool === TOOL_SELECT) {
      const start = selectStartRef.current;
      if (!start) return;
      setSelection(normalizeRect(start, pt));
      return;
    }

    const stroke = currentStrokeRef.current;
    if (!stroke) return;
    stroke.points.push(pt);
    lastPtRef.current = pt;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx) paintStroke(ctx, { ...stroke, points: stroke.points.slice(-2) });
  };

  const onPointerUp = (e) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;

    if (tool === TOOL_SELECT) {
      const start = selectStartRef.current;
      const pt = canvasPoint(e) || lastPtRef.current;
      selectStartRef.current = null;
      if (start && pt) {
        const rect = normalizeRect(start, pt);
        setSelection(selectionHasArea(rect) ? rect : null);
      }
      lastPtRef.current = null;
      try {
        canvasRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      return;
    }

    currentStrokeRef.current = null;
    lastPtRef.current = null;
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const handleUndo = () => {
    strokeStackRef.current.pop();
    redraw();
  };

  const handleClear = async () => {
    const editingSaved = editingSavedRef.current;
    const ok = await confirm({
      title: "Clear drawing?",
      message: editingSaved
        ? "This clears the entire saved diagram and leaves a blank page."
        : "This removes all pen strokes on the canvas.",
      confirmLabel: "Clear",
      variant: "danger",
    });
    if (!ok) return;
    strokeStackRef.current = [];
    currentStrokeRef.current = null;
    setSelection(null);
    selectStartRef.current = null;
    if (editingSaved) {
      bgImageRef.current = null;
      editingSavedRef.current = false;
      setSelected({ id: "", name: "Blank paper", imageUrl: "", blank: true });
    }
    redraw();
  };

  const applySavedResponse = (data) => {
    const list = normalizeJobDiagrams(data.jobDiagrams, data.jobDiagram);
    setDiagrams(list);
    const savedOne = normalizeJobDiagram(data.diagram) || list.find((d) => d.id === editingDiagramId) || list[list.length - 1] || null;
    if (savedOne?.id) {
      setActiveId(savedOne.id);
      setEditingDiagramId(savedOne.id);
    }
    onSaved?.(list, data.item, savedOne);
    return { list, savedOne };
  };

  const handleSave = async () => {
    if (!recordId || !canvasRef.current) return;
    setSaving(true);
    try {
      const blob = await new Promise((resolve, reject) => {
        canvasRef.current.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Could not export diagram"))),
          "image/png"
        );
      });
      const fd = new FormData();
      fd.append("file", blob, "job-diagram.png");
      fd.append("documentName", "Job diagram");
      fd.append("templateId", selected?.id || "");
      fd.append("templateName", selected?.name || (selected?.blank ? "Blank paper" : ""));

      const replaceId = String(editingDiagramId || "").trim();
      const endpoint = replaceId
        ? `/api/dashboard/simple-service-proposals/${recordId}/diagrams/${encodeURIComponent(replaceId)}`
        : `/api/dashboard/simple-service-proposals/${recordId}/diagrams`;

      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      applySavedResponse(data);
      toast.success(replaceId ? "Diagram updated." : "Diagram saved.");
      setStep("view");
    } catch (err) {
      toast.error(err.message || "Could not save diagram");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (diagram = active) => {
    const target = normalizeJobDiagram(diagram);
    if (!recordId || !target?.id) return;
    const ok = await confirm({
      title: "Delete diagram?",
      message: "Remove this diagram from the job? Other diagrams are kept.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(
        `/api/dashboard/simple-service-proposals/${recordId}/diagrams/${encodeURIComponent(target.id)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      const list = normalizeJobDiagrams(data.jobDiagrams, data.jobDiagram);
      setDiagrams(list);
      setActiveId("");
      setEditingDiagramId("");
      onSaved?.(list, data.item, null);
      toast.success("Diagram deleted.");
      if (list.length) {
        setStep("list");
      } else {
        setStep("pick");
        void loadTemplates();
      }
    } catch (err) {
      toast.error(err.message || "Could not delete");
    }
  };

  const handlePrint = () => {
    const url = step === "draw" ? canvasRef.current?.toDataURL("image/png") : active?.url;
    if (!url) return;
    const root = document.createElement("div");
    root.id = "simple-diagram-print-root";
    root.setAttribute("aria-hidden", "true");
    root.style.cssText =
      "position:fixed;left:-100vw;top:0;opacity:0;pointer-events:none;z-index:-1;width:8.5in;";
    root.innerHTML = `<img src="${url}" alt="Job diagram" style="width:100%;height:auto;" />`;
    document.body.appendChild(root);
    setPrintRoot(root);
  };

  useLayoutEffect(() => {
    if (!printRoot) return undefined;
    const style = document.createElement("style");
    style.setAttribute("data-simple-diagram-print", "1");
    style.textContent = `
      @media print {
        body * { visibility: hidden !important; }
        #simple-diagram-print-root, #simple-diagram-print-root * { visibility: visible !important; }
        #simple-diagram-print-root {
          position: fixed !important;
          left: 0 !important;
          top: 0 !important;
          opacity: 1 !important;
          width: 100% !important;
          z-index: 99999 !important;
          background: white !important;
        }
      }
    `;
    document.head.appendChild(style);
    let cancelled = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        window.print();
      });
    });
    const cleanup = () => {
      cancelled = true;
      style.remove();
      printRoot.remove();
      setPrintRoot(null);
    };
    window.addEventListener("afterprint", cleanup);
    return () => {
      window.removeEventListener("afterprint", cleanup);
      cleanup();
    };
  }, [printRoot]);

  if (!open) return null;

  const title =
    step === "view"
      ? "View diagram"
      : step === "draw"
        ? editingDiagramId
          ? "Edit diagram"
          : "Draw diagram"
        : step === "list"
          ? "Job diagrams"
          : "Add diagram";

  const headerActions =
    step === "list" ? (
      <>
        <Button type="button" size="sm" variant="primary" onClick={openAddDiagram}>
          <FiPlus className="h-4 w-4 shrink-0" />
          Add diagram
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onClose}>
          Close
        </Button>
      </>
    ) : step === "view" ? (
      <>
        <Button type="button" size="sm" variant="outline" onClick={() => setStep("list")}>
          <FiArrowLeft className="h-4 w-4 shrink-0" />
          All diagrams
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={handlePrint} disabled={!active?.url}>
          Print
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => void startEditSaved()}>
          Edit
        </Button>
        <Button
          type="button"
          size="sm"
          variant="primary"
          onClick={() => {
            setEditingDiagramId(active?.id || "");
            setStep("pick");
            void loadTemplates();
          }}
        >
          Replace
        </Button>
        <Button type="button" size="sm" variant="danger" onClick={() => void handleDelete()}>
          <FiTrash2 className="h-4 w-4 shrink-0" />
          Delete
        </Button>
      </>
    ) : step === "draw" ? (
      <>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            if (editingDiagramId && active?.url) {
              setStep("view");
            } else if (diagrams.length) {
              setStep("list");
            } else {
              setStep("pick");
            }
          }}
        >
          <FiArrowLeft className="h-4 w-4 shrink-0" />
          Back
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={handlePrint}>
          Print
        </Button>
        <Button type="button" size="sm" variant="primary" disabled={saving} onClick={() => void handleSave()}>
          <FiDownload className="h-4 w-4 shrink-0" />
          {saving ? "Saving…" : editingDiagramId ? "Update diagram" : "Save to job"}
        </Button>
      </>
    ) : (
      <>
        {diagrams.length ? (
          <Button type="button" size="sm" variant="outline" onClick={() => setStep("list")}>
            <FiArrowLeft className="h-4 w-4 shrink-0" />
            All diagrams
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="outline" onClick={onClose}>
          Close
        </Button>
      </>
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="7xl"
      width="98vw"
      height="95vh"
      className="!max-h-[95vh]"
      closeOnOutsideClick={false}
      actions={headerActions}
      bodyClassName="!flex !h-full !min-h-0 !flex-col !overflow-hidden !p-2 sm:!p-3"
    >
      {step === "list" ? (
        <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
          <p className="shrink-0 text-sm text-secondary">
            This job can have multiple diagrams. Open one to view or edit, or add another.
          </p>
          {diagrams.length === 0 ? (
            <p className="py-8 text-center text-sm text-secondary">No diagrams yet.</p>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {diagrams.map((d, index) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => openViewDiagram(d)}
                    className="flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition hover:border-primary hover:shadow-sm"
                  >
                    <div className="flex h-36 items-center justify-center bg-white p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={d.url} alt="" className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="border-t border-border px-2 py-1.5">
                      <div className="truncate text-sm font-medium text-title">
                        {d.name || `Diagram ${index + 1}`}
                      </div>
                      <div className="truncate text-xs text-secondary">
                        {d.templateName || "Custom"}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {step === "pick" ? (
        <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search diagram designs…"
              className="max-w-sm"
            />
            <Button type="button" size="sm" variant="outline" onClick={() => void loadTemplates()} disabled={loadingTemplates}>
              Refresh
            </Button>
            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={() => void startDrawWithTemplate({ id: "", name: "Blank paper", imageUrl: "", blank: true })}
            >
              Blank paper
            </Button>
          </div>
          <p className="shrink-0 text-sm text-secondary">
            Choose a blank design from admin or your shop settings, or start on blank paper. Then draw with a stylus or mouse.
          </p>
          <div className="min-h-0 flex-1 overflow-auto">
            {loadingTemplates ? (
              <p className="py-8 text-center text-sm text-secondary">Loading designs…</p>
            ) : templates.length === 0 ? (
              <p className="py-8 text-center text-sm text-secondary">
                No designs found. Use Blank paper, or upload designs under Settings → Diagrams or Admin → Diagram designs.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => void startDrawWithTemplate(tpl)}
                    className="flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition hover:border-primary hover:shadow-sm"
                  >
                    <div className="flex h-28 items-center justify-center bg-white p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={tpl.imageUrl} alt="" className="max-h-full max-w-full object-contain" />
                    </div>
                    <div className="border-t border-border px-2 py-1.5">
                      <div className="truncate text-sm font-medium text-title">{tpl.name}</div>
                      <div className="truncate text-xs text-secondary">
                        {tpl.scope === "platform" ? "Platform" : "Shop"}
                        {tpl.description ? ` · ${tpl.description}` : ""}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {step === "view" && active?.url ? (
        <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center overflow-auto bg-muted/30 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={active.url}
            alt={active.name || "Job diagram"}
            className="h-full max-h-full w-auto max-w-full rounded border border-border bg-white object-contain shadow-sm"
          />
        </div>
      ) : null}

      {step === "draw" ? (
        <div className="flex h-full min-h-0 flex-1 flex-col gap-2">
          <div className="shrink-0 border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-stretch gap-0 divide-x divide-border">
              {/* Mode */}
              <div className="flex min-w-[11rem] flex-col gap-1.5 px-3 py-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-secondary">
                  Interaction
                </span>
                <div className="inline-flex overflow-hidden border border-border bg-muted/40">
                  <DiagramSegBtn
                    active={canvasMode === MODE_DRAW}
                    onClick={() => chooseCanvasMode(MODE_DRAW)}
                    title="Draw on the canvas"
                    icon={<FiEdit2 className="h-3.5 w-3.5 shrink-0" />}
                    label="Draw"
                  />
                  <DiagramSegBtn
                    active={canvasMode === MODE_ZOOM}
                    onClick={() => chooseCanvasMode(MODE_ZOOM)}
                    title="Pinch zoom and pan"
                    icon={<FiZoomIn className="h-3.5 w-3.5 shrink-0" />}
                    label="Zoom"
                  />
                </div>
                {canvasMode === MODE_ZOOM ? (
                  <div className="flex items-center gap-1.5">
                    <DiagramIconBtn
                      onClick={handleFitView}
                      title="Fit diagram to view"
                      label="Fit"
                    >
                      <FiMaximize className="h-3.5 w-3.5 shrink-0" />
                    </DiagramIconBtn>
                    <span className="inline-flex min-w-[3rem] items-center justify-center border border-border bg-background px-2 py-1 text-xs font-semibold tabular-nums text-foreground">
                      {Math.round(zoom * 100)}%
                    </span>
                    <span className="text-[11px] text-secondary">
                      <FiMove className="mr-1 inline h-3 w-3" />
                      Pinch / drag
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Tools */}
              <div
                className={`flex min-w-[12rem] flex-1 flex-col gap-1.5 px-3 py-2.5 ${
                  canvasMode === MODE_ZOOM ? "opacity-45" : ""
                }`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-secondary">
                  Tools
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  <DiagramIconBtn
                    active={canvasMode === MODE_DRAW && tool === TOOL_PEN}
                    disabled={canvasMode === MODE_ZOOM}
                    onClick={() => chooseTool(TOOL_PEN)}
                    title="Pen"
                    label="Pen"
                  >
                    <FiEdit2 className="h-4 w-4 shrink-0" />
                  </DiagramIconBtn>
                  <DiagramIconBtn
                    active={canvasMode === MODE_DRAW && tool === TOOL_ERASER}
                    disabled={canvasMode === MODE_ZOOM}
                    onClick={() => chooseTool(TOOL_ERASER)}
                    title="Eraser"
                    label="Eraser"
                  >
                    <BiEraser className="h-4 w-4 shrink-0" />
                  </DiagramIconBtn>
                  <DiagramIconBtn
                    active={canvasMode === MODE_DRAW && tool === TOOL_SELECT}
                    disabled={canvasMode === MODE_ZOOM}
                    onClick={() => chooseTool(TOOL_SELECT)}
                    title="Select area"
                    label="Select"
                  >
                    <FiSquare className="h-4 w-4 shrink-0" />
                  </DiagramIconBtn>
                  <div className="mx-1 h-7 w-px bg-border" aria-hidden />
                  <DiagramIconBtn
                    danger
                    disabled={canvasMode === MODE_ZOOM || !selectionHasArea(selection)}
                    onClick={handleDeleteSelection}
                    title="Delete selected area"
                    label="Delete area"
                  >
                    <FiTrash2 className="h-4 w-4 shrink-0" />
                  </DiagramIconBtn>
                  <DiagramIconBtn
                    disabled={canvasMode === MODE_ZOOM}
                    onClick={handleUndo}
                    title="Undo last change"
                    label="Undo"
                  >
                    <FiRotateCcw className="h-4 w-4 shrink-0" />
                  </DiagramIconBtn>
                  <button
                    type="button"
                    disabled={canvasMode === MODE_ZOOM}
                    onClick={() => void handleClear()}
                    title="Clear entire drawing"
                    className="inline-flex h-9 items-center gap-1.5 border border-border bg-background px-2.5 text-xs font-semibold text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Style */}
              <div
                className={`flex min-w-[16rem] flex-[1.2] flex-col gap-1.5 px-3 py-2.5 ${
                  canvasMode === MODE_ZOOM ? "opacity-45" : ""
                }`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-secondary">
                  Stroke
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    {PEN_COLORS.map((c) => {
                      const selectedColor =
                        canvasMode === MODE_DRAW && tool === TOOL_PEN && penColor === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          title={c}
                          disabled={canvasMode === MODE_ZOOM}
                          onClick={() => {
                            setPenColor(c);
                            chooseTool(TOOL_PEN);
                          }}
                          className={`diagram-color-swatch h-5 w-5 shrink-0 rounded-full border transition-shadow disabled:cursor-not-allowed ${
                            selectedColor
                              ? "border-primary ring-2 ring-primary/35"
                              : "border-black/20 hover:ring-2 hover:ring-border"
                          }`}
                          style={{ backgroundColor: c, borderRadius: "9999px" }}
                          aria-label={`Pen color ${c}`}
                        />
                      );
                    })}
                    <label
                      className={`diagram-color-swatch relative inline-flex h-5 w-5 shrink-0 overflow-hidden rounded-full border-2 border-white shadow-[0_0_0_1.5px_hsl(var(--foreground)/0.55)] ${
                        canvasMode === MODE_ZOOM ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                      }`}
                      style={{
                        borderRadius: "9999px",
                        backgroundImage:
                          "conic-gradient(from 0deg, #ef4444, #f97316, #eab308, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)",
                      }}
                      title="Custom color"
                    >
                      <input
                        type="color"
                        value={penColor}
                        disabled={canvasMode === MODE_ZOOM}
                        onChange={(e) => {
                          setPenColor(e.target.value);
                          chooseTool(TOOL_PEN);
                        }}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                        aria-label="Custom pen color"
                      />
                    </label>
                  </div>
                  <div className="mx-0.5 hidden h-7 w-px bg-border sm:block" aria-hidden />
                  <div className="flex min-w-[9rem] flex-1 items-center gap-2">
                    <span className="shrink-0 text-[11px] font-medium text-secondary">Width</span>
                    <input
                      type="range"
                      min={1}
                      max={16}
                      value={penSize}
                      onChange={(e) => setPenSize(Number(e.target.value) || 3)}
                      className="h-1.5 w-full min-w-[4.5rem] accent-primary"
                      disabled={canvasMode === MODE_ZOOM}
                      aria-label="Stroke width"
                    />
                    <span className="inline-flex min-w-[2.25rem] justify-end text-xs font-semibold tabular-nums text-foreground">
                      {penSize}px
                    </span>
                    <span
                      className="inline-block shrink-0 rounded-full bg-foreground"
                      style={{
                        width: Math.max(4, Math.min(14, penSize)),
                        height: Math.max(4, Math.min(14, penSize)),
                        backgroundColor: tool === TOOL_ERASER ? "#94a3b8" : penColor,
                      }}
                      aria-hidden
                    />
                  </div>
                </div>
              </div>

              {/* Context */}
              <div className="flex min-w-[10rem] flex-col justify-center gap-1 px-3 py-2.5 sm:max-w-[14rem]">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-secondary">
                  Diagram
                </span>
                <p className="truncate text-sm font-semibold text-foreground" title={selected?.name || "Diagram"}>
                  {selected?.name || "Diagram"}
                </p>
                <p className="text-[11px] leading-snug text-secondary">
                  {canvasMode === MODE_ZOOM
                    ? "Zoom mode: pinch to zoom around your fingers, drag to pan. Switch to Draw to mark up."
                    : tool === TOOL_SELECT
                      ? "Select mode: drag a box, then delete the area. Press Delete or Escape."
                      : tool === TOOL_ERASER
                        ? "Eraser mode: scrub to remove strokes."
                        : "Draw mode: stylus and mouse supported."}
                </p>
              </div>
            </div>
          </div>

          <div
            ref={viewportRef}
            className={`flex min-h-0 flex-1 overflow-auto border border-border bg-muted/40 p-1 sm:p-2 ${
              canvasMode === MODE_ZOOM ? "touch-none cursor-grab active:cursor-grabbing" : ""
            }`}
            onPointerDown={canvasMode === MODE_ZOOM ? onZoomPointerDown : undefined}
            onPointerMove={canvasMode === MODE_ZOOM ? onZoomPointerMove : undefined}
            onPointerUp={canvasMode === MODE_ZOOM ? onZoomPointerUp : undefined}
            onPointerCancel={canvasMode === MODE_ZOOM ? onZoomPointerUp : undefined}
          >
            <div
              className="relative m-auto shrink-0"
              style={{
                width: Math.max(1, Math.round(fitSize.w * zoom)),
                height: Math.max(1, Math.round(fitSize.h * zoom)),
              }}
            >
              <canvas
                ref={canvasRef}
                width={CANVAS_W}
                height={CANVAS_H}
                className={`bg-white shadow-sm ${canvasMode === MODE_DRAW ? "touch-none" : "pointer-events-none"}`}
                style={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                  cursor:
                    canvasMode === MODE_ZOOM
                      ? "inherit"
                      : tool === TOOL_SELECT
                        ? "crosshair"
                        : tool === TOOL_ERASER
                          ? "cell"
                          : "crosshair",
                }}
                onPointerDown={canvasMode === MODE_DRAW ? onPointerDown : undefined}
                onPointerMove={canvasMode === MODE_DRAW ? onPointerMove : undefined}
                onPointerUp={canvasMode === MODE_DRAW ? onPointerUp : undefined}
                onPointerCancel={canvasMode === MODE_DRAW ? onPointerUp : undefined}
              />
              {selectionHasArea(selection) || (tool === TOOL_SELECT && selection) ? (
                <div
                  aria-hidden
                  className="pointer-events-none absolute border-2 border-dashed border-primary bg-primary/10"
                  style={{
                    left: `${((selection?.x || 0) / CANVAS_W) * 100}%`,
                    top: `${((selection?.y || 0) / CANVAS_H) * 100}%`,
                    width: `${((selection?.w || 0) / CANVAS_W) * 100}%`,
                    height: `${((selection?.h || 0) / CANVAS_H) * 100}%`,
                  }}
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

function DiagramSegBtn({ active, onClick, title, icon, label }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 px-3 text-xs font-semibold transition-colors ${
        active
          ? "bg-primary text-white"
          : "bg-transparent text-foreground hover:bg-background"
      }`}
    >
      {icon}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

function DiagramIconBtn({
  active = false,
  danger = false,
  disabled = false,
  onClick,
  title,
  label,
  children,
}) {
  return (
    <button
      type="button"
      title={title || label}
      aria-label={title || label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-9 min-w-9 items-center justify-center gap-1 border px-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "border-primary bg-primary text-white"
          : danger
            ? "border-border bg-background text-danger hover:bg-danger/10"
            : "border-border bg-background text-foreground hover:bg-muted"
      }`}
    >
      {children}
      {label ? <span className="sr-only">{label}</span> : null}
    </button>
  );
}

function paintEraseRect(ctx, op) {
  if (!op) return;
  const x = Number(op.x) || 0;
  const y = Number(op.y) || 0;
  const w = Number(op.w) || 0;
  const h = Number(op.h) || 0;
  if (w <= 0 || h <= 0) return;
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

function paintStroke(ctx, stroke) {
  const pts = stroke.points || [];
  if (!pts.length) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  if (stroke.eraser) {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
  } else {
    ctx.globalCompositeOperation = "source-over";
  }
  if (pts.length === 1) {
    const p = pts[0];
    const r = (stroke.size * (0.5 + (p.pressure || 0.5))) / 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(r, 0.5), 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      ctx.lineWidth = stroke.size * (0.6 + (p.pressure || 0.5) * 0.8);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  ctx.restore();
}
