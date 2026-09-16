"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import DocumentPrintOffscreenPortal from "@/components/dashboard/document-print-offscreen-portal";
import { useToast } from "@/components/toast-provider";
import { trackMotorLocation, trackMotorTitle } from "@/lib/track-motor-fields";

/**
 * §6.6 - printable durable label for a motor. The QR points at the motor inside
 * IQMotorTrack, which requires login, so scanning exposes nothing publicly.
 *
 * Follows the house print rule: off-screen portal plus the native print dialog,
 * no extra overlay for the user to dismiss.
 */
export default function TrackMotorQrLabel({ motor, open, onClose }) {
  const toast = useToast();
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    if (!open || !motor?.id) return undefined;
    let cancelled = false;
    const target = `${window.location.origin}/Track?motor=${encodeURIComponent(motor.id)}`;
    QRCode.toDataURL(target, { errorCorrectionLevel: "M", margin: 1, width: 420 })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error("Could not build the QR code.");
        onClose?.();
      });
    return () => {
      cancelled = true;
      setDataUrl("");
    };
  }, [open, motor?.id, onClose, toast]);

  if (!open || !dataUrl) return null;

  return (
    <DocumentPrintOffscreenPortal open onClose={() => onClose?.()}>
      <div style={{ fontFamily: "Arial, Helvetica, sans-serif", color: "#111111" }}>
        <div
          style={{
            border: "2px solid #111111",
            borderRadius: 10,
            padding: "18px 20px",
            width: "4.6in",
            display: "flex",
            gap: 18,
            alignItems: "center",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl} alt="Motor QR code" width={150} height={150} style={{ display: "block" }} />
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 9, letterSpacing: 1.6, fontWeight: 700 }}>IQMOTORTRACK</p>
            <p style={{ margin: "4px 0 0", fontSize: 17, fontWeight: 800, lineHeight: 1.2 }}>
              {trackMotorTitle(motor)}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 12 }}>
              {trackMotorLocation(motor) || "Location not recorded"}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 12 }}>
              <strong>S/N:</strong> {motor.serialNumber || "Not provided"}
            </p>
            {motor.locationAssetTag ? (
              <p style={{ margin: "4px 0 0", fontSize: 12 }}>
                <strong>Asset tag:</strong> {motor.locationAssetTag}
              </p>
            ) : null}
            <p style={{ margin: "8px 0 0", fontSize: 9, color: "#444444" }}>
              Scan to open this motor. Sign in required.
            </p>
          </div>
        </div>
      </div>
    </DocumentPrintOffscreenPortal>
  );
}
