"use client";

import { useEffect, useState } from "react";
import { FiChevronRight } from "react-icons/fi";
import Badge from "@/components/ui/badge";
import { useToast } from "@/components/toast-provider";
import {
  TRACK_RFQ_STATUS_LABEL,
  TRACK_RFQ_STATUS_VARIANT,
  trackFormatMoney,
} from "@/lib/track-rfq";
import { appFetch } from "./api";
import { useTrackAuth } from "./auth-context";
import { TrackEmpty, trackDateLabel } from "./ui";

const SCOPES = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" },
];

/** §6.7 - the RFQ list, so a plant can find a request without going motor by motor. */
export default function TrackRfqsScreen({ onOpenRfq, refreshKey = 0 }) {
  const toast = useToast();
  const { token } = useTrackAuth();
  const [scope, setScope] = useState("open");
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await appFetch(`/api/track/rfqs?scope=${scope}`, { token });
        if (!cancelled) setRfqs(data.rfqs || []);
      } catch (err) {
        if (!cancelled) toast.error(err.message || "Could not load RFQs.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, scope, refreshKey]);

  return (
    <div className="space-y-3 px-4 pb-8 pt-3">
      <div className="flex gap-1 rounded-xl border border-border bg-card p-1">
        {SCOPES.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setScope(item.value)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold ${
              scope === item.value ? "bg-primary text-white" : "text-secondary"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? <p className="text-sm text-secondary">Loading RFQs…</p> : null}

      {!loading && rfqs.length === 0 ? (
        <TrackEmpty
          title={scope === "open" ? "No open RFQs" : "Nothing here yet"}
          message="Open a motor and press Motor Down to send a request to nearby repair shops."
        />
      ) : null}

      <ul className="space-y-2">
        {rfqs.map((rfq) => {
          const awarded = (rfq.invitations || []).find((inv) => inv.status === "awarded");
          return (
            <li key={rfq.id}>
              <button
                type="button"
                onClick={() => onOpenRfq?.(rfq.id)}
                className="flex w-full items-center gap-2 rounded-2xl border border-border bg-card p-3 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-title">{rfq.motorTitle}</span>
                  <span className="mt-0.5 block truncate text-xs text-secondary">
                    Sent {trackDateLabel(rfq.sentAt || rfq.createdAt)}
                    {rfq.reference ? ` · ${rfq.reference}` : ""}
                  </span>
                  <span className="mt-2 flex flex-wrap gap-1.5">
                    <Badge
                      variant={TRACK_RFQ_STATUS_VARIANT[rfq.status] || "default"}
                      className="rounded-full px-2.5 py-0.5 text-xs"
                    >
                      {TRACK_RFQ_STATUS_LABEL[rfq.status] || rfq.status}
                    </Badge>
                    <Badge variant="default" className="rounded-full px-2.5 py-0.5 text-xs">
                      {rfq.proposalsReceived} of {rfq.invitedCount} responded
                    </Badge>
                    {rfq.urgency === "emergency" ? (
                      <Badge variant="danger" className="rounded-full px-2.5 py-0.5 text-xs">
                        Emergency
                      </Badge>
                    ) : null}
                    {awarded?.shopName ? (
                      <Badge variant="success" className="rounded-full px-2.5 py-0.5 text-xs">
                        {awarded.shopName}
                        {awarded.response?.totalPrice
                          ? ` · ${trackFormatMoney(awarded.response.totalPrice, awarded.response.currency)}`
                          : ""}
                      </Badge>
                    ) : null}
                  </span>
                </span>
                <FiChevronRight className="h-4 w-4 shrink-0 text-secondary" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
