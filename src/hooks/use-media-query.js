"use client";

import { useEffect, useState } from "react";

/**
 * Subscribe to a CSS media query. Returns false until mounted to avoid SSR mismatch.
 * @param {string} query
 * @returns {boolean}
 */
export default function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const mq = window.matchMedia(query);
    const apply = () => setMatches(Boolean(mq.matches));
    apply();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
    mq.addListener(apply);
    return () => mq.removeListener(apply);
  }, [query]);

  return matches;
}

/**
 * Phone chrome (bottom nav / drawer): below Tailwind `md` (768px).
 * Some small tablets (e.g. iPad mini portrait ~744px) still match this.
 */
export const PHONE_MAX_MQ = "(max-width: 767px)";

export function useIsPhone() {
  return useMediaQuery(PHONE_MAX_MQ);
}

/**
 * Full-page form routes (Service Proposal, PO, etc.): handsets only.
 * Below Tailwind `sm` (640px) so tablets keep desktop modal / web form UI in PWA.
 */
export const PHONE_FORM_MAX_MQ = "(max-width: 639px)";

export function useIsPhoneForm() {
  return useMediaQuery(PHONE_FORM_MAX_MQ);
}
