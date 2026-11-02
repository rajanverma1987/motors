"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

/**
 * Full-screen rear-camera QR scanner for Time Clock wall QR.
 * @param {{ expectedToken: string, onMatched: (raw: string) => void, onCancel: () => void }} props
 */
export default function TimeClockQrScanner({ expectedToken, onMatched, onCancel }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const matchedRef = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function start() {
      setError("");
      matchedRef.current = false;
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera is not available in this browser.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        scanLoop();
      } catch (err) {
        const code = err?.name || "";
        if (code === "NotAllowedError" || code === "PermissionDeniedError") {
          setError("Camera permission denied. Allow camera for this site, then try again.");
        } else if (code === "NotFoundError") {
          setError("No camera found on this device.");
        } else {
          setError(err?.message || "Could not open the camera.");
        }
      }
    }

    function tokenFromQrPayload(raw) {
      const text = String(raw || "").trim();
      if (!text) return "";
      if (text === expectedToken) return text;
      try {
        const u = new URL(text);
        const parts = u.pathname.split("/").filter(Boolean);
        const idx = parts.findIndex((p) => p === "time-clock");
        if (idx >= 0 && parts[idx + 1]) {
          return decodeURIComponent(parts[idx + 1]);
        }
      } catch {
        // not a URL
      }
      const m = text.match(/\/time-clock\/([^/?#]+)/i);
      if (m?.[1]) return decodeURIComponent(m[1]);
      return "";
    }

    function scanLoop() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || cancelled || matchedRef.current) return;
      if (video.readyState >= 2) {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (w && h) {
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h);
            const image = ctx.getImageData(0, 0, w, h);
            let value = "";
            const code = jsQR(image.data, image.width, image.height, {
              inversionAttempts: "dontInvert",
            });
            if (code?.data) value = code.data;
            if (value) {
              const scannedToken = tokenFromQrPayload(value);
              if (scannedToken && scannedToken === expectedToken) {
                matchedRef.current = true;
                onMatched(value);
                return;
              }
              if (scannedToken && scannedToken !== expectedToken) {
                setError("That QR is for a different shop. Scan this shop Time Clock QR.");
              }
            }
          }
        }
      }
      rafRef.current = requestAnimationFrame(scanLoop);
    }

    void start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const stream = streamRef.current;
      if (stream) stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      const video = videoRef.current;
      if (video) video.srcObject = null;
    };
  }, [expectedToken, onMatched]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <p className="text-sm font-semibold">Scan shop Time Clock QR</p>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-white/40 px-3 py-1.5 text-sm font-semibold"
        >
          Cancel
        </button>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
          autoPlay
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-56 w-56 rounded-lg border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
        </div>
        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
      </div>
      <div className="space-y-2 px-4 py-4 text-center text-sm">
        {error ? <p className="text-amber-300">{error}</p> : null}
        <p className="text-white/80">Point at the printed shop QR on the wall.</p>
      </div>
    </div>
  );
}
