"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { FiArrowLeft, FiDownload, FiPlus, FiTrash2 } from "react-icons/fi";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import { normalizeJobDiagram, normalizeJobDiagrams } from "@/lib/diagram-templates-shared";

const CANVAS_W = 1400;
const CANVAS_H = 1000;
const PEN_COLORS = ["#111827", "#dc2626", "#2563eb", "#16a34a", "#ca8a04"];

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
  const [eraser, setEraser] = useState(false);
  const [printRoot, setPrintRoot] = useState(null);
  /** When set, save replaces this diagram id; empty string means create new. */
  const [editingDiagramId, setEditingDiagramId] = useState("");

  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPtRef = useRef(null);
  const strokeStackRef = useRef([]);
  const currentStrokeRef = useRef(null);
  const bgImageRef = useRef(null);
  /** True when canvas background is a previously saved job diagram (baked image). */
  const editingSavedRef = useRef(false);

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
    bgImageRef.current = null;
    editingSavedRef.current = false;
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
    for (const stroke of strokeStackRef.current) {
      paintStroke(ctx, stroke);
    }
  }, []);

  const startDrawWithTemplate = useCallback(
    async (tpl) => {
      resetDrawState();
      editingSavedRef.current = false;
      setSelected(tpl);
      setStep("draw");
      setEraser(false);

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

  const onPointerDown = (e) => {
    if (step !== "draw") return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const pt = canvasPoint(e);
    if (!pt) return;
    drawingRef.current = true;
    lastPtRef.current = pt;
    const stroke = {
      color: eraser ? "#ffffff" : penColor,
      size: eraser ? Math.max(penSize * 4, 12) : penSize,
      eraser,
      points: [pt],
    };
    currentStrokeRef.current = stroke;
    strokeStackRef.current.push(stroke);
    const ctx = canvas.getContext("2d");
    if (ctx) paintStroke(ctx, stroke);
  };

  const onPointerMove = (e) => {
    if (!drawingRef.current || step !== "draw") return;
    e.preventDefault();
    const pt = canvasPoint(e);
    if (!pt) return;
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
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border pb-2">
            <span className="text-xs font-medium text-secondary">Pen</span>
            {PEN_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onClick={() => {
                  setPenColor(c);
                  setEraser(false);
                }}
                className={`h-7 w-7 rounded-full border-2 ${
                  !eraser && penColor === c ? "border-primary ring-2 ring-primary/30" : "border-border"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
            <label className="ml-2 flex items-center gap-1 text-xs text-secondary">
              Size
              <input
                type="range"
                min={1}
                max={16}
                value={penSize}
                onChange={(e) => setPenSize(Number(e.target.value) || 3)}
                className="w-24"
              />
            </label>
            <Button
              type="button"
              size="sm"
              variant={eraser ? "primary" : "outline"}
              onClick={() => setEraser((v) => !v)}
            >
              Eraser
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={handleUndo}>
              Undo
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => void handleClear()}>
              Clear
            </Button>
            <span className="ml-auto truncate text-xs text-secondary">
              {selected?.name || "Diagram"} · stylus / mouse supported
            </span>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded border border-border bg-muted/40 p-1 sm:p-2">
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              className="touch-none bg-white shadow-sm"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                width: "auto",
                height: "100%",
                aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
                cursor: eraser ? "cell" : "crosshair",
              }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
          </div>
        </div>
      ) : null}
    </Modal>
  );
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
