"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { FiArrowLeft, FiDownload, FiTrash2 } from "react-icons/fi";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import { useToast } from "@/components/toast-provider";
import { useConfirm } from "@/components/confirm-provider";
import { normalizeJobDiagram } from "@/lib/diagram-templates-shared";

const CANVAS_W = 1400;
const CANVAS_H = 1000;
const PEN_COLORS = ["#111827", "#dc2626", "#2563eb", "#16a34a", "#ca8a04"];

/**
 * Full-height modal: pick a blank design (or paper), draw with stylus/mouse, save to the job.
 */
export default function SimpleDiagramModal({
  open,
  onClose,
  recordId,
  jobDiagram,
  onSaved,
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [step, setStep] = useState("pick"); // pick | draw | view
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null); // { id, name, imageUrl } | blank
  const [saving, setSaving] = useState(false);
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [penSize, setPenSize] = useState(3);
  const [eraser, setEraser] = useState(false);
  const [printRoot, setPrintRoot] = useState(null);

  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPtRef = useRef(null);
  const strokeStackRef = useRef([]);
  const currentStrokeRef = useRef(null);
  const bgImageRef = useRef(null);

  const saved = normalizeJobDiagram(jobDiagram);

  const resetDrawState = useCallback(() => {
    drawingRef.current = false;
    lastPtRef.current = null;
    strokeStackRef.current = [];
    currentStrokeRef.current = null;
    bgImageRef.current = null;
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
    if (saved?.url) {
      setStep("view");
      setSelected(null);
    } else {
      setStep("pick");
      setSelected(null);
      void loadTemplates();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps -- init on open only

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

  const startEditSaved = useCallback(async () => {
    if (!saved?.url) return;
    resetDrawState();
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
  }, [redraw, resetDrawState, saved, toast]);

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
    const ok = await confirm({
      title: "Clear drawing?",
      message: "This removes all pen strokes on the canvas.",
      confirmLabel: "Clear",
      variant: "danger",
    });
    if (!ok) return;
    strokeStackRef.current = [];
    redraw();
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
      const res = await fetch(`/api/dashboard/simple-service-proposals/${recordId}/diagram`, {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onSaved?.(data.jobDiagram, data.item);
      toast.success("Diagram saved.");
      setStep("view");
    } catch (err) {
      toast.error(err.message || "Could not save diagram");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!recordId || !saved?.url) return;
    const ok = await confirm({
      title: "Delete diagram?",
      message: "Remove the saved diagram from this job?",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/dashboard/simple-service-proposals/${recordId}/diagram`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      onSaved?.(null, data.item);
      toast.success("Diagram deleted.");
      setStep("pick");
      void loadTemplates();
    } catch (err) {
      toast.error(err.message || "Could not delete");
    }
  };

  const handlePrint = () => {
    const url = step === "draw" ? canvasRef.current?.toDataURL("image/png") : saved?.url;
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
        ? "Draw diagram"
        : "Draw / View Diagram";

  const headerActions =
    step === "view" ? (
      <>
        <Button type="button" size="sm" variant="outline" onClick={handlePrint} disabled={!saved?.url}>
          Print
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => void startEditSaved()}>
          Edit
        </Button>
        <Button type="button" size="sm" variant="primary" onClick={() => { setStep("pick"); void loadTemplates(); }}>
          Replace
        </Button>
        <Button type="button" size="sm" variant="danger" onClick={() => void handleDelete()}>
          <FiTrash2 className="h-4 w-4 shrink-0" />
          Delete
        </Button>
      </>
    ) : step === "draw" ? (
      <>
        <Button type="button" size="sm" variant="outline" onClick={() => setStep("pick")}>
          <FiArrowLeft className="h-4 w-4 shrink-0" />
          Designs
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={handlePrint}>
          Print
        </Button>
        <Button type="button" size="sm" variant="primary" disabled={saving} onClick={() => void handleSave()}>
          <FiDownload className="h-4 w-4 shrink-0" />
          {saving ? "Saving…" : "Save to job"}
        </Button>
      </>
    ) : (
      <Button type="button" size="sm" variant="outline" onClick={onClose}>
        Close
      </Button>
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="7xl"
      width="98vw"
      height="min(96vh, 1100px)"
      closeOnOutsideClick={false}
      actions={headerActions}
      bodyClassName="!p-3 flex flex-col min-h-0"
    >
      {step === "pick" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
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
            {saved?.url ? (
              <Button type="button" size="sm" variant="outline" onClick={() => setStep("view")}>
                Back to saved
              </Button>
            ) : null}
          </div>
          <p className="text-sm text-secondary">
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

      {step === "view" && saved?.url ? (
        <div className="flex min-h-0 flex-1 flex-col items-center overflow-auto bg-muted/30 p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={saved.url}
            alt={saved.name || "Job diagram"}
            className="max-h-full max-w-full rounded border border-border bg-white object-contain shadow-sm"
          />
        </div>
      ) : null}

      {step === "draw" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
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
          <div className="min-h-0 flex-1 overflow-auto rounded border border-border bg-muted/40 p-2">
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              className="mx-auto block max-h-full max-w-full touch-none bg-white shadow-sm"
              style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}`, width: "100%", cursor: eraser ? "cell" : "crosshair" }}
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
