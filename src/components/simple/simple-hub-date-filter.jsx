"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiCalendar } from "react-icons/fi";
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
  dateInputPlaceholderForLocale,
  dateLocaleFromCurrency,
  formatDateLocale,
  toInputDateValue,
} from "@/lib/format-date";
import {
  SIMPLE_PORTAL_PATH,
  SIMPLE_TAB_IDS,
  SIMPLE_TAB_REPORTS,
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
  "!h-9 !min-h-9 !w-[8.75rem] !rounded-none !border-border/80 !bg-bg !px-1.5 !py-0 !pr-7 text-xs leading-none";
const DATE_FILTER_BUTTON_CLASS = "h-9 shrink-0 !rounded-none px-2.5 text-xs";

function dateFilterPillClass(active) {
  return `${DATE_FILTER_PILL_BASE} ${active ? DATE_FILTER_PILL_ACTIVE : DATE_FILTER_PILL_INACTIVE}`;
}

function displayDate(value, locale) {
  const iso = toInputDateValue(value, locale ? { locale } : undefined);
  if (!iso) return "";
  const text = formatDateLocale(iso, locale);
  return text && text !== "-" ? text : iso;
}

/** ISO first, then each locale (Windows m/d/yyyy, shop currency, and so on). */
function parseFlexibleDate(raw, locales) {
  const text = String(raw || "").trim();
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    const iso = toInputDateValue(text);
    if (iso) return iso;
  }
  const tried = new Set();
  for (const locale of locales) {
    const key = String(locale || "").trim();
    if (!key || tried.has(key)) continue;
    tried.add(key);
    const ymd = toInputDateValue(text, { locale: key });
    if (ymd) return ymd;
  }
  return toInputDateValue(text) || "";
}

/**
 * Hub date range controls for Simple `/dashboards`.
 * Dates are typed in the browser locale (for example Windows m/d/yyyy). Go parses that format.
 * @param {{ className?: string, placement?: "nav" | "below" | "reports", onApplied?: (range: { from: string, to: string }) => void }} props
 */
export default function SimpleHubDateFilter({ className = "", placement = "reports", onApplied }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { settings } = useUserSettings();
  const tabParam = searchParams.get("tab");
  const activeTab = SIMPLE_TAB_IDS.includes(tabParam) ? tabParam : SIMPLE_TAB_SERVICE_PROPOSALS;

  const dateLocale = useMemo(
    () => dateLocaleFromCurrency(settings?.currency) || "en-US",
    [settings?.currency]
  );
  const [osLocale, setOsLocale] = useState("");
  useEffect(() => {
    const lang = typeof navigator !== "undefined" ? String(navigator.language || "").trim() : "";
    if (lang) setOsLocale(lang);
  }, []);
  const fieldLocale = osLocale || dateLocale;
  const parseLocales = useMemo(() => {
    const list = [];
    if (fieldLocale) list.push(fieldLocale);
    if (dateLocale && dateLocale !== fieldLocale) list.push(dateLocale);
    return list;
  }, [fieldLocale, dateLocale]);
  const placeholder = useMemo(
    () => dateInputPlaceholderForLocale(fieldLocale),
    [fieldLocale]
  );

  const fyDefault = useMemo(() => currentAllJobsFinancialYearRange(), []);
  const { from: appliedFrom, to: appliedTo } = parseAllJobsDateRange(searchParams);
  const isAllDates = !appliedFrom && !appliedTo;
  const isCurrentFy = isAllJobsCurrentFinancialYear(appliedFrom, appliedTo);
  const urlMode = isAllDates ? "all" : isCurrentFy ? "fy" : "custom";
  const [pickingCustom, setPickingCustom] = useState(false);
  const showCustom = urlMode === "custom" || pickingCustom;

  const [draftFrom, setDraftFrom] = useState(() =>
    displayDate(appliedFrom || fyDefault.from, dateLocale)
  );
  const [draftTo, setDraftTo] = useState(() => displayDate(appliedTo || fyDefault.to, dateLocale));
  const barRef = useRef(null);
  const fromWrapRef = useRef(null);
  const toWrapRef = useRef(null);
  const fromPickerRef = useRef(null);
  const toPickerRef = useRef(null);
  const draftRef = useRef({ from: draftFrom, to: draftTo });
  const onAppliedRef = useRef(onApplied);
  draftRef.current = { from: draftFrom, to: draftTo };
  onAppliedRef.current = onApplied;

  useEffect(() => {
    if (urlMode === "custom") setPickingCustom(false);
  }, [urlMode]);

  useEffect(() => {
    const active = document.activeElement;
    if (fromWrapRef.current?.contains(active) || toWrapRef.current?.contains(active)) return;
    if (isAllDates) {
      setDraftFrom(displayDate(fyDefault.from, fieldLocale));
      setDraftTo(displayDate(fyDefault.to, fieldLocale));
      return;
    }
    setDraftFrom(displayDate(appliedFrom, fieldLocale));
    setDraftTo(displayDate(appliedTo, fieldLocale));
  }, [appliedFrom, appliedTo, isAllDates, fyDefault.from, fyDefault.to, fieldLocale]);

  const applyDateRange = useCallback(
    (from, to) => {
      const nextFrom = toInputDateValue(from);
      const nextTo = toInputDateValue(to);
      onAppliedRef.current?.({ from: nextFrom, to: nextTo });
      const params = new URLSearchParams(window.location.search);
      if (!params.get("tab")) params.set("tab", activeTab);
      const currentFrom = params.get(ALL_JOBS_DATE_FROM_PARAM) || "";
      const currentTo = params.get(ALL_JOBS_DATE_TO_PARAM) || "";
      if (nextFrom) params.set(ALL_JOBS_DATE_FROM_PARAM, nextFrom);
      else params.delete(ALL_JOBS_DATE_FROM_PARAM);
      if (nextTo) params.set(ALL_JOBS_DATE_TO_PARAM, nextTo);
      else params.delete(ALL_JOBS_DATE_TO_PARAM);
      if (currentFrom === (nextFrom || "") && currentTo === (nextTo || "")) return;
      router.replace(`${SIMPLE_PORTAL_PATH}?${params.toString()}`, { scroll: false });
    },
    [activeTab, router]
  );

  const readWrapDate = (wrap, fallback) => {
    const raw = wrap?.querySelector('input[type="text"]')?.value;
    const text = String(raw != null ? raw : fallback || "").trim();
    if (!text) return { text: "", iso: "" };
    return { text, iso: parseFlexibleDate(text, parseLocales) };
  };

  const applyVisibleCustomRange = () => {
    const fromRead = readWrapDate(fromWrapRef.current, draftRef.current.from);
    const toRead = readWrapDate(toWrapRef.current, draftRef.current.to);
    if ((fromRead.text && !fromRead.iso) || (toRead.text && !toRead.iso)) return;
    let from = fromRead.iso;
    let to = toRead.iso;
    if (from && to && from > to) {
      const swap = from;
      from = to;
      to = swap;
    }
    const shownFrom = from ? displayDate(from, fieldLocale) : "";
    const shownTo = to ? displayDate(to, fieldLocale) : "";
    draftRef.current = { from: shownFrom, to: shownTo };
    setDraftFrom(shownFrom);
    setDraftTo(shownTo);
    applyDateRange(from, to);
  };

  const openPicker = (picker) => {
    if (!picker) return;
    try {
      if (typeof picker.showPicker === "function") {
        const pending = picker.showPicker();
        if (pending && typeof pending.catch === "function") pending.catch(() => {});
        return;
      }
    } catch {
      /* fall through */
    }
    picker.click();
  };

  const onPicked = (which, isoValue) => {
    const iso = toInputDateValue(isoValue);
    if (!iso) return;
    const shown = displayDate(iso, fieldLocale);
    if (which === "from") {
      draftRef.current = { ...draftRef.current, from: shown };
      setDraftFrom(shown);
      return;
    }
    draftRef.current = { ...draftRef.current, to: shown };
    setDraftTo(shown);
  };

  const onCustomDateBlur = (event) => {
    const next = event.relatedTarget;
    if (next && barRef.current?.contains(next)) return;
    applyVisibleCustomRange();
  };

  const fromTitle = draftFrom ? formatDateLocale(draftFrom, dateLocale) : "";
  const toTitle = draftTo ? formatDateLocale(draftTo, dateLocale) : "";

  if (activeTab !== SIMPLE_TAB_REPORTS) return null;

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
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder={placeholder}
              value={draftFrom}
              onChange={(e) => {
                draftRef.current = { ...draftRef.current, from: e.target.value };
                setDraftFrom(e.target.value);
              }}
              onBlur={onCustomDateBlur}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                applyVisibleCustomRange();
              }}
              className={DATE_FILTER_INPUT_CLASS}
              inputClassName={DATE_FILTER_INPUT_FIELD_CLASS}
              suffix={
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center text-secondary hover:text-primary"
                  aria-label="Choose From date"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => openPicker(fromPickerRef.current)}
                >
                  <FiCalendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
                </button>
              }
            />
            <input
              ref={fromPickerRef}
              type="date"
              tabIndex={-1}
              aria-hidden
              className="absolute left-0 top-full h-px w-px opacity-0"
              value={parseFlexibleDate(draftFrom, parseLocales) || ""}
              onChange={(e) => onPicked("from", e.target.value)}
            />
          </div>
          <div ref={toWrapRef} title={toTitle || undefined} className="relative z-0">
            <Input
              label="To"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder={placeholder}
              value={draftTo}
              onChange={(e) => {
                draftRef.current = { ...draftRef.current, to: e.target.value };
                setDraftTo(e.target.value);
              }}
              onBlur={onCustomDateBlur}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                applyVisibleCustomRange();
              }}
              className={DATE_FILTER_INPUT_CLASS}
              inputClassName={DATE_FILTER_INPUT_FIELD_CLASS}
              suffix={
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center text-secondary hover:text-primary"
                  aria-label="Choose To date"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => openPicker(toPickerRef.current)}
                >
                  <FiCalendar className="h-3.5 w-3.5 shrink-0" aria-hidden />
                </button>
              }
            />
            <input
              ref={toPickerRef}
              type="date"
              tabIndex={-1}
              aria-hidden
              className="absolute left-0 top-full h-px w-px opacity-0"
              value={parseFlexibleDate(draftTo, parseLocales) || ""}
              onChange={(e) => onPicked("to", e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className={`${DATE_FILTER_BUTTON_CLASS} relative z-10`}
            onClick={applyVisibleCustomRange}
          >
            Go
          </Button>
        </>
      ) : null}
    </div>
  );
}
