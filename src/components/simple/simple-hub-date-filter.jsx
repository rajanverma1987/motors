"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { useUserSettings } from "@/contexts/user-settings-context";
import {
  ALL_JOBS_DATE_FROM_PARAM,
  ALL_JOBS_DATE_TO_PARAM,
  currentAllJobsFinancialYearRange,
  isAllJobsCurrentFinancialYear,
  parseAllJobsDateRange,
} from "@/lib/all-jobs-date-filter";
import {
  dateLocaleFromCurrency,
  formatDateLocale,
  toInputDateValue,
} from "@/lib/format-date";
import {
  SIMPLE_PORTAL_PATH,
  SIMPLE_TAB_IDS,
  SIMPLE_TAB_SERVICE_PROPOSALS,
} from "@/lib/simple-portal-tabs";

const DATE_FILTER_PILL_BASE =
  "inline-flex h-9 min-h-9 min-w-[2.75rem] shrink-0 cursor-pointer items-center justify-center rounded-none border px-3 text-xs font-semibold transition-colors";
const DATE_FILTER_PILL_INACTIVE =
  "border-border/80 bg-card text-title shadow-none hover:border-primary/45 hover:bg-primary/[0.03]";
const DATE_FILTER_PILL_ACTIVE =
  "border-primary bg-primary/20 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.35)]";
const DATE_FILTER_INPUT_CLASS =
  "mb-0 !flex !w-auto !min-w-0 !flex-row !items-center !gap-1 [&_label]:mb-0 [&_label]:shrink-0 [&_label]:text-[11px] [&_label]:font-medium [&_label]:text-secondary";
const DATE_FILTER_INPUT_FIELD_CLASS =
  "!h-9 !min-h-9 !w-[8.25rem] !rounded-none !border-border/80 !bg-bg !px-1.5 !py-0 text-xs leading-none";
const DATE_FILTER_BUTTON_CLASS = "h-9 shrink-0 !rounded-none px-2.5 text-xs";

function dateFilterPillClass(active) {
  return `${DATE_FILTER_PILL_BASE} ${active ? DATE_FILTER_PILL_ACTIVE : DATE_FILTER_PILL_INACTIVE}`;
}

/**
 * Hub date range controls for Simple `/dashboards`.
 * Native calendar via type="date" (ISO value); title shows Settings country format.
 * @param {{ className?: string, placement?: "nav" | "below" | "reports" }} props
 */
export default function SimpleHubDateFilter({ className = "", placement = "reports" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings } = useUserSettings();
  const tabParam = searchParams.get("tab");
  const activeTab = SIMPLE_TAB_IDS.includes(tabParam) ? tabParam : SIMPLE_TAB_SERVICE_PROPOSALS;

  const dateLocale = useMemo(
    () => dateLocaleFromCurrency(settings?.currency) || "en-US",
    [settings?.currency]
  );

  const fyDefault = useMemo(() => currentAllJobsFinancialYearRange(), []);
  const { from: appliedFrom, to: appliedTo } = parseAllJobsDateRange(searchParams);
  const isAllDates = !appliedFrom && !appliedTo;
  const isCurrentFy = isAllJobsCurrentFinancialYear(appliedFrom, appliedTo);
  const urlMode = isAllDates ? "all" : isCurrentFy ? "fy" : "custom";
  const [pickingCustom, setPickingCustom] = useState(false);
  const showCustom = urlMode === "custom" || pickingCustom;

  const [draftFrom, setDraftFrom] = useState(() => toInputDateValue(appliedFrom || fyDefault.from));
  const [draftTo, setDraftTo] = useState(() => toInputDateValue(appliedTo || fyDefault.to));
  const barRef = useRef(null);
  const fromWrapRef = useRef(null);
  const toWrapRef = useRef(null);
  const draftRef = useRef({ from: draftFrom, to: draftTo });
  const activeTabRef = useRef(activeTab);
  const routerRef = useRef(router);
  const mutateQueueRef = useRef([]);
  const flushScheduledRef = useRef(false);
  const replaceGenRef = useRef(0);
  activeTabRef.current = activeTab;
  routerRef.current = router;
  draftRef.current = { from: draftFrom, to: draftTo };

  useEffect(() => {
    if (urlMode === "custom") setPickingCustom(false);
  }, [urlMode]);

  useEffect(() => {
    const active = document.activeElement;
    if (fromWrapRef.current?.contains(active) || toWrapRef.current?.contains(active)) return;
    if (isAllDates) {
      setDraftFrom(toInputDateValue(fyDefault.from));
      setDraftTo(toInputDateValue(fyDefault.to));
      return;
    }
    setDraftFrom(toInputDateValue(appliedFrom));
    setDraftTo(toInputDateValue(appliedTo));
  }, [appliedFrom, appliedTo, isAllDates, fyDefault.from, fyDefault.to]);

  const replaceSearchParams = useCallback((mutate) => {
    mutateQueueRef.current.push(mutate);
    if (flushScheduledRef.current) return;
    flushScheduledRef.current = true;
    queueMicrotask(() => {
      flushScheduledRef.current = false;
      const queue = mutateQueueRef.current.splice(0);
      const params = new URLSearchParams(window.location.search);
      if (!params.get("tab")) params.set("tab", activeTabRef.current);
      for (const fn of queue) fn(params);
      const next = `${SIMPLE_PORTAL_PATH}?${params.toString()}`;
      const current = `${window.location.pathname}${window.location.search}`;
      if (next === current) return;
      const gen = ++replaceGenRef.current;
      routerRef.current.replace(next, { scroll: false });
      window.setTimeout(() => {
        if (replaceGenRef.current !== gen) return;
        const now = `${window.location.pathname}${window.location.search}`;
        if (now === next) return;
        routerRef.current.replace(next, { scroll: false });
      }, 80);
    });
  }, []);

  const applyDateRange = useCallback(
    (from, to) => {
      const nextFrom = toInputDateValue(from);
      const nextTo = toInputDateValue(to);
      replaceSearchParams((params) => {
        if (nextFrom) params.set(ALL_JOBS_DATE_FROM_PARAM, nextFrom);
        else params.delete(ALL_JOBS_DATE_FROM_PARAM);
        if (nextTo) params.set(ALL_JOBS_DATE_TO_PARAM, nextTo);
        else params.delete(ALL_JOBS_DATE_TO_PARAM);
      });
    },
    [replaceSearchParams]
  );

  const readWrapDate = (wrap, fallback) => {
    const raw = wrap?.querySelector("input")?.value;
    const next = toInputDateValue(raw);
    if (next) return next;
    return toInputDateValue(fallback) || "";
  };

  const applyVisibleCustomRange = () => {
    let from = readWrapDate(fromWrapRef.current, draftRef.current.from);
    let to = readWrapDate(toWrapRef.current, draftRef.current.to);
    if (from && to && from > to) {
      const swap = from;
      from = to;
      to = swap;
    }
    setDraftFrom(from);
    setDraftTo(to);
    applyDateRange(from, to);
  };

  const onCustomDateBlur = (event) => {
    const next = event.relatedTarget;
    if (next && barRef.current?.contains(next)) return;
    applyVisibleCustomRange();
  };

  const fromTitle = draftFrom ? formatDateLocale(draftFrom, dateLocale) : "";
  const toTitle = draftTo ? formatDateLocale(draftTo, dateLocale) : "";

  const placementClass =
    placement === "below"
      ? "simple-hub-date-bar--below"
      : placement === "nav"
        ? "simple-hub-date-bar--nav"
        : "simple-hub-date-bar--reports";

  /** Do not combine bare `flex` with `hidden` — Tailwind conflict shows both bars on tablet. */
  const visibilityClass = placement === "nav" ? "hidden lg:flex" : "flex";

  return (
    <div
      ref={barRef}
      className={`simple-hub-date-bar ${placementClass} ${visibilityClass} relative z-30 shrink-0 pointer-events-auto ${className}`.trim()}
      role="group"
      aria-label="Hub date range"
    >
      <button
        type="button"
        className={dateFilterPillClass(urlMode === "all" && !pickingCustom)}
        aria-pressed={urlMode === "all" && !pickingCustom}
        onClick={() => {
          setPickingCustom(false);
          applyDateRange("", "");
        }}
      >
        All
      </button>
      <button
        type="button"
        className={dateFilterPillClass(urlMode === "fy" && !pickingCustom)}
        aria-pressed={urlMode === "fy" && !pickingCustom}
        onClick={() => {
          setPickingCustom(false);
          applyDateRange(fyDefault.from, fyDefault.to);
        }}
      >
        FY
      </button>
      <button
        type="button"
        className={dateFilterPillClass(showCustom)}
        aria-pressed={showCustom}
        onClick={() => setPickingCustom(true)}
      >
        Custom Dates
      </button>
      {showCustom ? (
        <>
          <div ref={fromWrapRef} title={fromTitle || undefined} className="relative z-0">
            <Input
              label="From"
              type="date"
              value={draftFrom}
              onChange={(e) => {
                setDraftFrom(e.target.value);
                applyVisibleCustomRange();
              }}
              onBlur={onCustomDateBlur}
              className={DATE_FILTER_INPUT_CLASS}
              inputClassName={DATE_FILTER_INPUT_FIELD_CLASS}
            />
          </div>
          <div ref={toWrapRef} title={toTitle || undefined} className="relative z-0">
            <Input
              label="To"
              type="date"
              value={draftTo}
              onChange={(e) => {
                setDraftTo(e.target.value);
                applyVisibleCustomRange();
              }}
              onBlur={onCustomDateBlur}
              className={DATE_FILTER_INPUT_CLASS}
              inputClassName={DATE_FILTER_INPUT_FIELD_CLASS}
            />
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className={`${DATE_FILTER_BUTTON_CLASS} relative z-10`}
            onMouseDown={(e) => {
              e.preventDefault();
              applyVisibleCustomRange();
            }}
            onClick={applyVisibleCustomRange}
          >
            Go
          </Button>
        </>
      ) : null}
    </div>
  );
}
