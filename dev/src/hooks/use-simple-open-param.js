"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clearSimpleOpenParams } from "@/lib/simple-portal-open";

/**
 * When URL has `open=<id>` (and optional tab already selected), invoke onOpen once, then clear the param.
 * @param {{
 *   ready: boolean,
 *   enabled?: boolean,
 *   paramKey?: string,
 *   onOpen: (openId: string) => boolean | void | Promise<boolean | void>,
 * }} options
 */
export function useSimpleOpenParam({ ready, enabled = true, paramKey = "open", onOpen }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const openId = String(searchParams.get(paramKey) || "").trim();
  const handledRef = useRef("");
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    if (!enabled || !ready || !openId) return;
    if (handledRef.current === `${paramKey}:${openId}`) return;
    handledRef.current = `${paramKey}:${openId}`;

    let cancelled = false;
    (async () => {
      const result = await onOpenRef.current(openId);
      if (cancelled || result === false) {
        handledRef.current = "";
        return;
      }
      router.replace(clearSimpleOpenParams(searchParams, [paramKey]), { scroll: false });
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, ready, openId, paramKey, router, searchParams]);
}
