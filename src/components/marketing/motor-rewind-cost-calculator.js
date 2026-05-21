"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiUpload } from "react-icons/fi";
import {
  computeCustomerRewindBallpark,
  DEFAULT_CUSTOMER_COPPER_USD_PER_KG,
} from "@/lib/motor-rewind-cost/calculate";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import { Form, FormSectionTitle } from "@/components/ui/form-layout";
import LeadFormModal from "@/components/lead-form-modal";
import CalculatorPaywallModal from "@/components/marketing/calculator-paywall-modal";
import { useCalculatorAccess } from "@/hooks/use-calculator-access";
import { useAuth } from "@/contexts/auth-context";
import { calculatorAuthUrls } from "@/lib/calculator-auth-flow";

const LS_DRAFT = "motorRewindCustomerDraft_v2";

const CALCULATOR_SOURCE_PAGE = "/electric-motor-rewinding-cost-calculator";

/** Ballpark range spread around point estimate (conversion UX). */
const RANGE_LOW_FACTOR = 0.88;
const RANGE_HIGH_FACTOR = 1.12;

/** Above this HP, show industrial / formal-quote messaging. */
const INDUSTRIAL_HP_THRESHOLD = 100;

/** Below this midpoint ($), do not suggest replacement—small-job rewinds feel wrong vs “new motor” heuristic. */
const REPLACEMENT_MIDPOINT_MIN_USD = 1500;

const DEFAULT_LEAD_INTRO =
  "Request quotes from rewinding shops near you. Your details and calculator summary are sent to IQMotorBase so we can help match you with shops.";

const NAMEPLATE_FAST_PATH_INTRO =
  "Don't know all the winding specs? Attach clear nameplate photos (and any failure notes). We'll route your request so shops can estimate or advise next steps.";

/**
 * Generic replacement benchmark scaled by US PPI for motor manufacturing when available (else multiplier 1).
 * Anchor for the base formula is configured server-side (MOTOR_REPLACEMENT_PPI_ANCHOR).
 */
function estimateNewMotorReplacementUsd(motorHp, motorPpiMultiplier = 1) {
  const h = Number(motorHp);
  if (!Number.isFinite(h) || h <= 0) return null;
  const m = Number.isFinite(motorPpiMultiplier) && motorPpiMultiplier > 0 ? motorPpiMultiplier : 1;
  return Math.round((350 + h * 98) * m);
}

function rpmLabelForCopy(form) {
  const r = form?.rpm != null ? String(form.rpm).trim() : "";
  return r || "1800 (typical)";
}

const HP_OPTIONS = [
  { value: "0.5", label: "0.5 HP" },
  { value: "0.75", label: "0.75 HP" },
  { value: "1", label: "1 HP" },
  { value: "1.5", label: "1.5 HP" },
  { value: "2", label: "2 HP" },
  { value: "3", label: "3 HP" },
  { value: "5", label: "5 HP" },
  { value: "7.5", label: "7.5 HP" },
  { value: "10", label: "10 HP" },
  { value: "15", label: "15 HP" },
  { value: "20", label: "20 HP" },
  { value: "25", label: "25 HP" },
  { value: "30", label: "30 HP" },
  { value: "40", label: "40 HP" },
  { value: "50", label: "50 HP" },
  { value: "60", label: "60 HP" },
  { value: "75", label: "75 HP" },
  { value: "100", label: "100 HP" },
  { value: "125", label: "125 HP" },
];

const RPM_OPTIONS = [
  { value: "900", label: "900 RPM" },
  { value: "1000", label: "1000 RPM" },
  { value: "1200", label: "1200 RPM" },
  { value: "1500", label: "1500 RPM" },
  { value: "1800", label: "1800 RPM" },
  { value: "3000", label: "3000 RPM" },
  { value: "3600", label: "3600 RPM" },
];

const RPM_OPTIONS_OPTIONAL = [{ value: "", label: "Typical / not sure (1800 RPM)" }, ...RPM_OPTIONS];

const SLOT_OPTIONS = [
  { value: "12", label: "12 slots" },
  { value: "18", label: "18 slots" },
  { value: "24", label: "24 slots" },
  { value: "30", label: "30 slots" },
  { value: "36", label: "36 slots" },
  { value: "48", label: "48 slots" },
  { value: "54", label: "54 slots" },
  { value: "60", label: "60 slots" },
  { value: "72", label: "72 slots" },
];

const WIRE_OPTIONS = [
  { value: "18", label: "AWG 18" },
  { value: "17", label: "AWG 17" },
  { value: "16", label: "AWG 16" },
  { value: "15", label: "AWG 15" },
  { value: "14", label: "AWG 14" },
  { value: "13", label: "AWG 13" },
  { value: "12", label: "AWG 12" },
  { value: "11", label: "AWG 11" },
  { value: "10", label: "AWG 10" },
  { value: "9", label: "AWG 9" },
  { value: "8", label: "AWG 8" },
  { value: "7", label: "AWG 7" },
];

const PHASE_OPTIONS = [
  { value: "1", label: "Single-phase" },
  { value: "3", label: "Three-phase" },
];

const COIL_OPTIONS = [
  { value: "lap", label: "Lap" },
  { value: "wave", label: "Wave" },
  { value: "concentric", label: "Concentric" },
];

const VOLTAGE_OPTIONS = [
  { value: "115", label: "115 V" },
  { value: "208", label: "208 V" },
  { value: "230", label: "230 V" },
  { value: "460", label: "460 V" },
  { value: "575", label: "575 V" },
  { value: "690", label: "690 V" },
  { value: "2400", label: "2.4 kV" },
  { value: "4160", label: "4.16 kV" },
];

const TEMPLATES = [
  {
    id: "1hp3600",
    label: "1 HP · 3600 RPM · 24 slot",
    patch: {
      ratingUnit: "hp",
      hp: "1",
      kw: "",
      phase: "3",
      voltage: "460",
      rpm: "3600",
      slots: "24",
      coilType: "lap",
      wireGauge: "17",
    },
  },
  {
    id: "3hp1800",
    label: "3 HP · 1800 RPM · 36 slot",
    patch: {
      ratingUnit: "hp",
      hp: "3",
      kw: "",
      phase: "3",
      voltage: "460",
      rpm: "1800",
      slots: "36",
      coilType: "lap",
      wireGauge: "15",
    },
  },
  {
    id: "5hp1800",
    label: "5 HP · 1800 RPM · 36 slot",
    patch: {
      ratingUnit: "hp",
      hp: "5",
      kw: "",
      phase: "3",
      voltage: "460",
      rpm: "1800",
      slots: "36",
      coilType: "lap",
      wireGauge: "14",
    },
  },
  {
    id: "10hp1800",
    label: "10 HP · 1800 RPM · 48 slot",
    patch: {
      ratingUnit: "hp",
      hp: "10",
      kw: "",
      phase: "3",
      voltage: "460",
      rpm: "1800",
      slots: "48",
      coilType: "lap",
      wireGauge: "13",
    },
  },
  {
    id: "22kw",
    label: "≈22 kW (~30 HP) · 1800 RPM · 48 slot",
    patch: {
      ratingUnit: "hp",
      hp: "30",
      kw: "",
      phase: "3",
      voltage: "460",
      rpm: "1800",
      slots: "48",
      coilType: "lap",
      wireGauge: "12",
    },
  },
];

const TEMPLATE_SELECT_OPTIONS = [
  { value: "", label: "Quick example (optional)…" },
  ...TEMPLATES.map((t) => ({ value: t.id, label: t.label })),
];

function defaultForm() {
  return {
    ratingUnit: "hp",
    hp: "10",
    kw: "",
    phase: "3",
    voltage: "460",
    rpm: "",
    slots: "36",
    coilType: "lap",
    wireGauge: "13",
    insulationMode: "fixed",
    insulationValue: "165",
    manualCuKg: "",
  };
}

function money(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(x);
}

/** Whole dollars — used for rounded ballpark band display. */
function moneyWhole(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(x);
}

/** Short label for API snapshot timestamp (en-US). */
function formatMarketSnapshotAt(iso) {
  if (!iso || typeof iso !== "string") return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/** Round band to cleaner increments ($25) for credibility in UI and leads. */
function roughBallparkBand(low, high) {
  const lo = Number(low);
  const hi = Number(high);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return { lowR: lo, highR: hi };
  const roundDown25 = (n) => Math.floor(n / 25) * 25;
  const roundUp25 = (n) => Math.ceil(n / 25) * 25;
  let lowR = roundDown25(lo);
  let highR = roundUp25(hi);
  if (highR < lowR) highR = lowR + 25;
  return { lowR, highR };
}

export function buildRewindCalculatorLeadPrefill(form, breakdown, rangeOpts = {}) {
  const { low, high, replacementRecommended } = rangeOpts;
  const phaseLabel = form.phase === "1" ? "Single-phase" : "Three-phase";
  const coilLabel =
    form.coilType === "lap"
      ? "Lap"
      : form.coilType === "wave"
        ? "Wave"
        : form.coilType === "concentric"
          ? "Concentric"
          : String(form.coilType || "—");

  const ratingLine =
    form.ratingUnit === "kw"
      ? `${form.kw || "—"} kW on nameplate (calculator used ~${breakdown.motorHp} HP equivalent for the ballpark)`
      : `${form.hp || "—"} HP on nameplate`;

  const copperLine =
    form.manualCuKg && String(form.manualCuKg).trim()
      ? `• Approximate copper weight (I entered): ${String(form.manualCuKg).trim()} kg\n`
      : "";

  const rough =
    low != null && high != null && Number.isFinite(low) && Number.isFinite(high) && low <= high
      ? roughBallparkBand(low, high)
      : null;

  const ballparkBlock =
    rough != null
      ? `Calculator planning range about ${moneyWhole(rough.lowR)} – ${moneyWhole(rough.highR)} USD (rule-of-thumb band). Typical materials + labor; final price depends on inspection, damage, varnish/VPI, bearings, tests, and shop rates.`
      : `Calculator planning figure about ${money(breakdown.ballparkTotal)} USD (typical materials + labor band). Final price depends on inspection, core/slot damage, insulation class, varnish/VPI, bearings, balance, electrical tests, rush fees, and your shop rates.`;

  const recLine =
    replacementRecommended === true
      ? `• Recommendation (rule-of-thumb): compare rewind vs new motor quotes before deciding.\n`
      : replacementRecommended === false
        ? `• Recommendation (rule-of-thumb): rewinding looks cost-effective at this ballpark (typically under ~60% of a generic new-motor benchmark).\n`
        : "";

  const problemDescription = `REQUEST — Motor rewinding quotes (IQMotorBase.com calculator)

WHAT I NEED
Qualified rewind / motor repair shops: please reply with a quote or offer to inspect. Local service or inbound freight is fine if you accept shipped cores.

MOTOR / WINDING (from calculator — verify against nameplate)
• Rating: ${ratingLine}
• Phase: ${phaseLabel}
• Voltage: ${form.voltage || "—"} V | RPM (as entered / typical): ${rpmLabelForCopy(form)}
• Slots: ${form.slots} | AWG: ${form.wireGauge} | Coil type: ${coilLabel}
${copperLine}
${recLine}
BALLPARK (WEBSITE ONLY — NOT A BINDING QUOTE)
${ballparkBlock}

NAMEPLATE / DOCUMENTS
• I can attach clear nameplate photos using “Motor photos” on this form if that helps your first pass.

PLEASE FILL IN THE LINES BELOW (anything you already know helps)
• Application (pump, fan, compressor, etc.):
• Failure / symptoms (trip, smoke, ground, bearings, environment):
• Frame, enclosure (TEFC/ODP), insulation class if known:
• Timeline (standard vs rush):
• Can you quote from photos + nameplate, or must the motor be in your shop first?
• Service area / willingness to accept shipped motor:
• Special construction (vertical, explosion-proof, washdown, inverter-duty, etc.) if applicable:

Thanks — I appreciate responses with clear scope, assumptions, and line items (labor, materials, testing, warranty).`;

  const motorHpShort =
    form.ratingUnit === "kw" ? `${form.kw || ""} kW (~${breakdown.motorHp} HP eq.)` : `${form.hp || ""} HP`;

  return {
    motorHp: motorHpShort,
    voltage: form.voltage ? `${form.voltage} V` : "",
    motorType: "AC motor rewinding",
    problemDescription,
  };
}

/** RFQ prefill from calculator inputs when ballpark price was not unlocked. */
function buildRewindQuoteLeadPrefillFromForm(form) {
  const phaseLabel = form.phase === "1" ? "Single-phase" : "Three-phase";
  const coilLabel =
    form.coilType === "lap"
      ? "Lap"
      : form.coilType === "wave"
        ? "Wave"
        : form.coilType === "concentric"
          ? "Concentric"
          : String(form.coilType || "—");
  const ratingLine = `${form.hp || "—"} HP on nameplate`;
  const problemDescription = `REQUEST — Motor rewinding quotes (IQMotorBase.com calculator)

WHAT I NEED
Qualified rewind / motor repair shops: please reply with a quote or offer to inspect. Local service or inbound freight is fine if you accept shipped cores.

MOTOR / WINDING (from calculator form — verify against nameplate)
• Rating: ${ratingLine}
• Phase: ${phaseLabel}
• Voltage: ${form.voltage || "—"} V | RPM (as entered / typical): ${rpmLabelForCopy(form)}
• Slots: ${form.slots} | AWG: ${form.wireGauge} | Coil type: ${coilLabel}

BALLPARK
• Website ballpark range was not unlocked on the cost calculator; please quote from inspection and nameplate.

NAMEPLATE / DOCUMENTS
• I can attach clear nameplate photos using “Motor photos” on this form if that helps your first pass.

PLEASE FILL IN THE LINES BELOW (anything you already know helps)
• Application (pump, fan, compressor, etc.):
• Failure / symptoms (trip, smoke, ground, bearings, environment):
• Frame, enclosure (TEFC/ODP), insulation class if known:
• Timeline (standard vs rush):
• Can you quote from photos + nameplate, or must the motor be in your shop first?
• Service area / willingness to accept shipped motor:
• Special construction (vertical, explosion-proof, washdown, inverter-duty, etc.) if applicable:

Thanks — I appreciate responses with clear scope, assumptions, and line items (labor, materials, testing, warranty).`;

  return {
    motorHp: `${form.hp || ""} HP`,
    voltage: form.voltage ? `${form.voltage} V` : "",
    motorType: "AC motor rewinding",
    problemDescription,
  };
}

export default function MotorRewindCostCalculator({
  variant = "full",
  calculatorSourcePage = CALCULATOR_SOURCE_PAGE,
  /** Use with variant="full" when the page already has an h1 (e.g. SEO guide hero). */
  fullHeadingAsH2 = false,
  /** Tighter spacing and typography for sidebars / narrow columns. */
  compact = false,
  /** When true, ballpark prices only load from the server after payment or subscription. */
  requirePaidAccess = false,
  /** Show link to calculators subscription page under the price CTA. */
  showAllCalculatorsCta = false,
  /** Cost guide: $5 PayPal unlock without registration. */
  allowGuestSingleUse = false,
}) {
  const isEmbedded = variant === "embedded";
  const isDashboard = variant === "dashboard";
  const isCompact = !!compact || isDashboard;
  /** Parent already shows a calculator title (e.g. cost page spotlight + fullHeadingAsH2). */
  const hideMainTitle = (isCompact && fullHeadingAsH2) || isDashboard;
  const router = useRouter();
  const { user } = useAuth();
  const calcAccess = useCalculatorAccess();
  const [form, setForm] = useState(defaultForm);
  const [templateId, setTemplateId] = useState("");
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadPrefill, setLeadPrefill] = useState(null);
  const [leadIntroOverride, setLeadIntroOverride] = useState(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const priceUnlockedReturnHandled = useRef(false);
  const [priceRevealed, setPriceRevealed] = useState(false);
  const [serverDerived, setServerDerived] = useState(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [teaserPreview, setTeaserPreview] = useState("");
  const [teaserLoading, setTeaserLoading] = useState(false);
  const [market, setMarket] = useState(() => ({
    copperUsdPerKg: DEFAULT_CUSTOMER_COPPER_USD_PER_KG,
    motorPpiMultiplier: 1,
    copperLive: false,
    motorLive: false,
    copperSourceLabel: "",
    motorSourceLabel: "",
    fetchedAt: "",
  }));

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- post-mount localStorage restore */
    try {
      const raw = localStorage.getItem(LS_DRAFT);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          const merged = { ...defaultForm(), ...parsed };
          if (merged.ratingUnit === "kw") {
            merged.ratingUnit = "hp";
            merged.kw = "";
          }
          setForm(merged);
        }
      }
    } catch {
      /* ignore */
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/marketing/motor-calculator-market");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data || typeof data !== "object") return;
        setMarket({
          copperUsdPerKg:
            typeof data.copperUsdPerKg === "number" && Number.isFinite(data.copperUsdPerKg)
              ? data.copperUsdPerKg
              : DEFAULT_CUSTOMER_COPPER_USD_PER_KG,
          motorPpiMultiplier:
            typeof data.motorPpiMultiplier === "number" && Number.isFinite(data.motorPpiMultiplier) && data.motorPpiMultiplier > 0
              ? data.motorPpiMultiplier
              : 1,
          copperLive: !!data.copperLive,
          motorLive: !!data.motorLive,
          copperSourceLabel: typeof data.copperSourceLabel === "string" ? data.copperSourceLabel : "",
          motorSourceLabel: typeof data.motorSourceLabel === "string" ? data.motorSourceLabel : "",
          fetchedAt: typeof data.fetchedAt === "string" ? data.fetchedAt : "",
        });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(LS_DRAFT, JSON.stringify(form));
      } catch {
        /* ignore */
      }
    }, 350);
    return () => clearTimeout(t);
  }, [form]);

  const derived = useMemo(() => {
    if (requirePaidAccess) return null;
    const breakdown = computeCustomerRewindBallpark({
      ...form,
      slots: Number(form.slots),
      voltage: Number(form.voltage),
      copperRatePerKg: market.copperUsdPerKg,
    });
    const total = breakdown.ballparkTotal;
    const low = Math.round(total * RANGE_LOW_FACTOR * 100) / 100;
    const high = Math.round(total * RANGE_HIGH_FACTOR * 100) / 100;
    const midpoint = (low + high) / 2;
    const rough = roughBallparkBand(low, high);
    const motorHp = breakdown.motorHp;
    const newMotorEstimate = estimateNewMotorReplacementUsd(motorHp, market.motorPpiMultiplier);
    const crossesReplaceVsNew =
      newMotorEstimate != null && Number.isFinite(total) && total > 0.6 * newMotorEstimate;
    const replacementRecommended =
      crossesReplaceVsNew && Number.isFinite(midpoint) && midpoint >= REPLACEMENT_MIDPOINT_MIN_USD;
    const industrial = Number.isFinite(motorHp) && motorHp > INDUSTRIAL_HP_THRESHOLD;
    const fractionalHpNote = Number.isFinite(motorHp) && motorHp > 0 && motorHp < 1;
    return {
      breakdown,
      low,
      high,
      roughLow: rough.lowR,
      roughHigh: rough.highR,
      newMotorEstimate,
      replacementRecommended,
      industrial,
      fractionalHpNote,
      copperLive: market.copperLive,
      motorLive: market.motorLive,
      copperSourceLabel: market.copperSourceLabel,
      motorSourceLabel: market.motorSourceLabel,
    };
  }, [form, market, requirePaidAccess]);

  const displayDerived = requirePaidAccess ? serverDerived : derived;
  const priceLocked = requirePaidAccess && !priceRevealed;

  const fetchServerEstimate = useCallback(
    async ({ consumeCredit = true, guest = false } = {}) => {
      setEstimateLoading(true);
      try {
        const useGuest = guest || (allowGuestSingleUse && !user);
        const endpoint = useGuest ? "/api/calculators/estimate/guest" : "/api/calculators/estimate";
        const res = await fetch(endpoint, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ form, consumeCredit: useGuest ? false : consumeCredit }),
        });
        const data = await res.json();
        if (res.status === 401 && !allowGuestSingleUse) {
          const urls = calculatorAuthUrls(
            typeof window !== "undefined"
              ? `${window.location.pathname}${window.location.hash || ""}`
              : "/cost-of-motor-repair-and-rewinding"
          );
          router.push(urls.loginUrl);
          return { locked: true };
        }
        if (res.status === 403 && useGuest) {
          setPriceRevealed(false);
          setServerDerived(null);
          return { locked: true };
        }
        if (!res.ok) throw new Error(data.error || "Estimate failed");
        if (data.locked) {
          setPriceRevealed(false);
          setServerDerived(null);
          return { locked: true };
        }
        const est = data.estimate;
        setServerDerived({
          breakdown: est.breakdown,
          low: est.low,
          high: est.high,
          roughLow: est.roughLow,
          roughHigh: est.roughHigh,
          newMotorEstimate: est.newMotorEstimate,
          replacementRecommended: est.replacementRecommended,
          industrial: est.industrial,
          fractionalHpNote: est.fractionalHpNote,
          copperLive: est.market?.copperLive,
          motorLive: est.market?.motorLive,
          copperSourceLabel: est.market?.copperSourceLabel,
          motorSourceLabel: est.market?.motorSourceLabel,
        });
        if (est.market) setMarket((m) => ({ ...m, ...est.market }));
        setPriceRevealed(true);
        if (!useGuest) await calcAccess.refresh();
        return { locked: false };
      } catch {
        return { locked: true, error: true };
      } finally {
        setEstimateLoading(false);
      }
    },
    [form, calcAccess, router, allowGuestSingleUse, user]
  );

  useEffect(() => {
    if (!requirePaidAccess || priceUnlockedReturnHandled.current) return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("price_unlocked") !== "1") return;
      priceUnlockedReturnHandled.current = true;

      (async () => {
        if (user) await calcAccess.refresh();
        const result = await fetchServerEstimate({
          consumeCredit: true,
          guest: allowGuestSingleUse && !user,
        });
        if (!result?.locked && !result?.error) {
          setPriceRevealed(true);
        }
        params.delete("price_unlocked");
        const path = window.location.pathname;
        const hash = window.location.hash || "#motor-rewind-cost-calculator";
        const qs = params.toString();
        const next = `${path}${qs ? `?${qs}` : ""}${hash}`;
        window.history.replaceState({}, "", next);
        const el = document.getElementById("motor-rewind-cost-calculator");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      })();
    } catch {
      /* ignore */
    }
  }, [requirePaidAccess, fetchServerEstimate, calcAccess, allowGuestSingleUse, user]);

  useEffect(() => {
    if (!requirePaidAccess || !allowGuestSingleUse || user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/calculators/guest-access", { credentials: "include", cache: "no-store" });
        const data = await res.json();
        if (cancelled || !data?.hasGuestUnlock) return;
        await fetchServerEstimate({ guest: true });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requirePaidAccess, allowGuestSingleUse, user, fetchServerEstimate]);

  useEffect(() => {
    if (!requirePaidAccess || !calcAccess.isSubscription || !calcAccess.hasAccess) return;
    const t = setTimeout(() => {
      fetchServerEstimate({ consumeCredit: false });
    }, 450);
    return () => clearTimeout(t);
  }, [
    requirePaidAccess,
    calcAccess.isSubscription,
    calcAccess.hasAccess,
    form.hp,
    form.phase,
    form.rpm,
    form.voltage,
    form.slots,
    form.coilType,
    form.wireGauge,
    form.manualCuKg,
    fetchServerEstimate,
  ]);

  useEffect(() => {
    if (!requirePaidAccess || calcAccess.isSubscription) return;
    setPriceRevealed(false);
    setServerDerived(null);
  }, [
    requirePaidAccess,
    calcAccess.isSubscription,
    form.hp,
    form.phase,
    form.rpm,
    form.voltage,
    form.slots,
    form.coilType,
    form.wireGauge,
    form.manualCuKg,
  ]);

  useEffect(() => {
    if (!requirePaidAccess || !priceLocked) {
      setTeaserPreview("");
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setTeaserLoading(true);
      try {
        const res = await fetch("/api/calculators/estimate/teaser", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ form }),
        });
        const data = await res.json();
        if (!cancelled && res.ok && typeof data.previewText === "string") {
          setTeaserPreview(data.previewText);
        }
      } catch {
        if (!cancelled) setTeaserPreview("");
      } finally {
        if (!cancelled) setTeaserLoading(false);
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [
    requirePaidAccess,
    priceLocked,
    form.hp,
    form.phase,
    form.rpm,
    form.voltage,
    form.slots,
    form.coilType,
    form.wireGauge,
    form.manualCuKg,
  ]);

  const handleSeePrice = useCallback(async () => {
    if (!requirePaidAccess) return;
    if (allowGuestSingleUse && !user) {
      setPaywallOpen(true);
      return;
    }
    if (!user) {
      const urls = calculatorAuthUrls(
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.hash || ""}`
          : "/cost-of-motor-repair-and-rewinding"
      );
      router.push(urls.loginUrl);
      return;
    }
    if (calcAccess.hasAccess) {
      const result = await fetchServerEstimate({ consumeCredit: !calcAccess.isSubscription });
      if (result?.locked) setPaywallOpen(true);
      return;
    }
    setPaywallOpen(true);
  }, [
    requirePaidAccess,
    allowGuestSingleUse,
    user,
    router,
    calcAccess.hasAccess,
    calcAccess.isSubscription,
    fetchServerEstimate,
  ]);

  const applyTemplate = useCallback((id) => {
    setTemplateId(id);
    if (!id) return;
    const t = TEMPLATES.find((x) => x.id === id);
    if (t?.patch) setForm((f) => ({ ...f, ...t.patch }));
  }, []);

  const handleField = (name) => (e) => {
    const v = e?.target?.value;
    setForm((prev) => ({ ...prev, [name]: v }));
  };

  const openQuoteModal = useCallback(() => {
    const d = displayDerived;
    setLeadIntroOverride(null);
    if (d?.breakdown) {
      setLeadPrefill(
        buildRewindCalculatorLeadPrefill(form, d.breakdown, {
          low: d.low,
          high: d.high,
          replacementRecommended: d.replacementRecommended,
        })
      );
    } else {
      setLeadPrefill(buildRewindQuoteLeadPrefillFromForm(form));
    }
    setLeadOpen(true);
  }, [form, displayDerived]);

  const openNameplateFastPath = useCallback(() => {
    setLeadIntroOverride(NAMEPLATE_FAST_PATH_INTRO);
    setLeadPrefill({
      motorHp: "",
      voltage: "",
      motorType: "AC motor rewinding",
      problemDescription: `I'm not sure of all winding specs yet. I have (or will upload) motor nameplate photo(s) and want rewind/repair guidance or a quote.\n\nPlease review photos and advise scope, inspection needs, and typical turnaround.`,
    });
    setLeadOpen(true);
  }, []);

  const closeLeadModal = useCallback(() => {
    setLeadOpen(false);
    setLeadIntroOverride(null);
  }, []);

  const marketSnapshotShort = formatMarketSnapshotAt(market.fetchedAt);

  return (
    <div
      className={`not-prose rounded-xl border border-border bg-card shadow-sm ${
        isCompact ? "p-3 sm:p-3" : isEmbedded ? "p-3 sm:p-4 md:p-5" : "p-4 sm:p-6"
      }`}
    >
      <div className={`border-b border-border ${isCompact ? "pb-3" : "pb-4"}`}>
        {!hideMainTitle ? (
          isEmbedded ? (
            <h2 className="text-lg font-semibold text-title sm:text-xl">
              Electric motor rewinding cost calculator
            </h2>
          ) : fullHeadingAsH2 ? (
            <h2 className="text-xl font-semibold text-title sm:text-2xl">
              Electric motor rewinding cost calculator
            </h2>
          ) : (
            <h1 className="text-xl font-semibold text-title sm:text-2xl">
              Electric motor rewinding cost calculator
            </h1>
          )
        ) : null}
        <p
          className={`text-secondary ${hideMainTitle ? "mt-0" : "mt-2"} ${
            isCompact ? "text-xs leading-snug" : "text-sm"
          }`}
        >
          Adjust HP, phase, and optionally RPM—your estimate updates instantly. Not a shop quote; inspection may change
          scope and price.
        </p>
        {!isDashboard ? (
          <div className={isCompact ? "mt-2" : "mt-4"}>
            <button
              type="button"
              onClick={openNameplateFastPath}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-primary bg-transparent font-semibold text-primary shadow-sm transition-colors hover:bg-primary/10 sm:w-auto sm:justify-start ${
                isCompact ? "px-3 py-2 text-xs" : "px-4 py-3 text-sm"
              }`}
            >
              <FiUpload className={`shrink-0 ${isCompact ? "h-3.5 w-3.5" : "h-4 w-4"}`} aria-hidden />
              Upload nameplate for an estimate
            </button>
            <p
              className={`text-center text-secondary sm:text-left ${isCompact ? "mt-1 text-[10px]" : "mt-2 text-xs"}`}
            >
              No specs needed
            </p>
          </div>
        ) : null}
      </div>

      <Form
        id="motor-rewind-customer-form"
        className={`!border-0 !bg-transparent !p-0 !shadow-none ${isCompact ? "mt-3" : "mt-4"}`}
        onSubmit={(e) => e.preventDefault()}
      >
        <FormSectionTitle as="h2" className={isCompact ? "!mb-2 !text-sm" : "!mb-3 !text-base sm:!text-lg"}>
          Your motor
        </FormSectionTitle>
        <div className={`grid sm:grid-cols-2 ${isCompact ? "gap-3" : "gap-4"}`}>
          <Select label="Motor HP" name="hp" options={HP_OPTIONS} value={form.hp} onChange={handleField("hp")} searchable={false} />
          <Select label="Phase" name="phase" options={PHASE_OPTIONS} value={form.phase} onChange={handleField("phase")} searchable={false} />
          <Select
            label="RPM (optional)"
            name="rpm"
            options={RPM_OPTIONS_OPTIONAL}
            value={form.rpm}
            onChange={handleField("rpm")}
            searchable={false}
          />
        </div>

        <details
          className={`rounded-lg border border-border bg-card/40 [&_summary::-webkit-details-marker]:hidden ${
            isCompact ? "mt-3" : "mt-5"
          }`}
        >
          <summary
            className={`flex cursor-pointer list-none items-center justify-between gap-2 font-medium text-title hover:bg-card/80 ${
              isCompact ? "px-2 py-2 text-xs sm:px-3" : "px-3 py-3 text-sm sm:px-4"
            }`}
          >
            <span>Advanced details (optional)</span>
            <span className={`font-normal text-secondary ${isCompact ? "max-w-[9rem] text-[10px] leading-tight" : "text-xs"}`}>
              Voltage, slots, coil, AWG, copper weight
            </span>
          </summary>
          <div
            className={`grid border-t border-border sm:grid-cols-2 ${isCompact ? "gap-3 px-2 pb-3 pt-3 sm:px-3" : "gap-4 px-3 pb-4 pt-4 sm:px-4"}`}
          >
            <div className="sm:col-span-2">
              <Select
                label="Example presets"
                name="template"
                options={TEMPLATE_SELECT_OPTIONS}
                value={templateId}
                onChange={(e) => applyTemplate(e.target.value)}
                searchable={false}
              />
            </div>
            <Select
              label="Voltage (nameplate)"
              name="voltage"
              options={VOLTAGE_OPTIONS}
              value={form.voltage}
              onChange={handleField("voltage")}
              searchable={false}
            />
            <Select label="Stator slots" name="slots" options={SLOT_OPTIONS} value={form.slots} onChange={handleField("slots")} searchable={false} />
            <Select label="Coil type" name="coilType" options={COIL_OPTIONS} value={form.coilType} onChange={handleField("coilType")} searchable={false} />
            <Select
              label="Magnet wire (AWG)"
              name="wireGauge"
              options={WIRE_OPTIONS}
              value={form.wireGauge}
              onChange={handleField("wireGauge")}
              searchable={false}
            />
            <Input
              label="Copper weight (optional)"
              name="manualCuKg"
              type="number"
              step="0.01"
              min="0"
              placeholder="Leave blank to estimate from size"
              value={form.manualCuKg}
              onChange={handleField("manualCuKg")}
              help="Only if you already know approximate copper weight from a shop or teardown."
              className="sm:col-span-2"
            />
          </div>
        </details>
      </Form>

      <div
        className={`rounded-xl border border-primary/30 bg-gradient-to-b from-primary/[0.11] to-primary/[0.04] shadow-sm ${
          isCompact ? "mt-4 p-3" : "mt-6 p-4 sm:p-5"
        }`}
      >
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="relative min-w-0 flex-1">
            <p
              className={`font-semibold uppercase tracking-wide text-primary ${
                isCompact ? "text-[9px]" : "text-[10px]"
              }`}
            >
              Ballpark estimate (US)
            </p>
            {priceLocked ? (
              <div
                className="relative mt-1 overflow-hidden rounded-md select-none"
                aria-label="Ballpark price preview — unlock for exact range"
              >
                <p
                  className={`pointer-events-none font-bold tabular-nums tracking-tight text-title blur-[14px] brightness-90 contrast-[0.35] saturate-50 ${
                    isCompact ? "min-h-[2rem] text-xl sm:min-h-[2.25rem] sm:text-2xl" : "min-h-[2.25rem] text-2xl sm:min-h-[2.75rem] sm:text-3xl"
                  } ${teaserLoading && !teaserPreview ? "opacity-40" : ""}`}
                  style={{ WebkitFilter: "blur(14px)", filter: "blur(14px)" }}
                >
                  {teaserPreview || "$000 – $000"}
                </p>
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-r from-card/55 via-card/25 to-card/55"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.45] mix-blend-overlay"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(-12deg, transparent, transparent 3px, rgba(128,128,128,0.12) 3px, rgba(128,128,128,0.12) 4px)",
                  }}
                  aria-hidden
                />
              </div>
            ) : (
              <p
                className={`mt-0.5 font-bold tabular-nums tracking-tight text-title ${
                  isCompact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
                }`}
              >
                {estimateLoading
                  ? "Calculating…"
                  : `${moneyWhole(displayDerived?.roughLow)} – ${moneyWhole(displayDerived?.roughHigh)}`}
              </p>
            )}
          </div>
          {priceLocked ? (
            <Button
              type="button"
              variant="primary"
              size={isCompact ? "sm" : "md"}
              className="shrink-0"
              disabled={estimateLoading || calcAccess.loading}
              onClick={handleSeePrice}
            >
              {estimateLoading ? "Loading…" : "Unlock price"}
            </Button>
          ) : null}
        </div>

        {priceLocked ? (
          <p className={`leading-snug text-secondary ${isCompact ? "mt-2 text-[10px]" : "mt-2 text-[11px]"}`}>
            Preview is intentionally blurred—log in, then unlock for the exact ballpark range (${calcAccess.pricing.singleUseUsd.toFixed(2)}{" "}
            single use or monthly subscription).
            {showAllCalculatorsCta ? (
              <>
                {" "}
                <Link href="/calculators-subscription" className="font-medium text-primary hover:underline">
                  See all calculators →
                </Link>
              </>
            ) : null}
          </p>
        ) : (
          <p className={`leading-snug text-secondary ${isCompact ? "mt-1.5 text-[10px]" : "mt-2 text-[11px]"}`}>
            Based on typical US rewind shop pricing (2025).
          </p>
        )}

        {!priceLocked && displayDerived?.fractionalHpNote ? (
          <p
            className={`mt-2 rounded-md border border-border bg-card/80 leading-snug text-secondary ${
              isCompact ? "px-2 py-1 text-[10px]" : "px-2.5 py-1.5 text-[11px]"
            }`}
          >
            Many shops charge a <strong className="text-title">minimum bench fee</strong> on fractional-HP motors—the
            total often reflects minimum labor more than copper alone.
          </p>
        ) : null}

        {!priceLocked && displayDerived?.industrial ? (
          <p
            className={`mt-2 rounded-md border border-amber-500/40 bg-amber-500/[0.08] leading-snug text-secondary ${
              isCompact ? "px-2 py-1 text-[10px]" : "px-2.5 py-1.5 text-[11px]"
            }`}
          >
            <strong className="text-title">Industrial motor:</strong> pricing is usually custom—use quote flow for scope
            after inspection.
          </p>
        ) : null}

        {!priceLocked && displayDerived ? (
          <div
            className={`mt-3 rounded-md border font-medium leading-snug ${
              isCompact ? "px-2 py-1.5 text-[11px]" : "px-2.5 py-2 text-[13px]"
            } ${displayDerived.replacementRecommended
                ? "border-warning/40 bg-warning/[0.12] text-title"
                : "border-success/35 bg-success/[0.1] text-title"
              }`}
          >
            <p>
              <span className="text-secondary">Recommendation:</span>{" "}
              {displayDerived.replacementRecommended ? (
                <>Compare rewind vs new motor quotes.</>
              ) : (
                <>Rewinding looks cost-effective at this range.</>
              )}
            </p>
            <p className={`font-normal leading-snug text-secondary ${isCompact ? "mt-0.5 text-[10px]" : "mt-1 text-[11px]"}`}>
              {displayDerived.replacementRecommended ? (
                <>Use written quotes from shops—not online benchmarks alone—to decide.</>
              ) : (
                <>Typically under ~60% of a generic new-motor benchmark.</>
              )}
            </p>
          </div>
        ) : null}

        {!isDashboard ? (
          <div className={`border-t border-primary/15 ${isCompact ? "mt-4 pt-3" : "mt-6 pt-5"}`}>
            <Button
              type="button"
              variant="primary"
              size={isCompact ? "sm" : "md"}
              className={isCompact ? "w-full" : "w-full sm:w-auto"}
              onClick={openQuoteModal}
            >
              Get exact quote in 30 minutes
            </Button>
            <p className={`leading-snug text-secondary ${isCompact ? "mt-1 text-[10px]" : "mt-1.5 text-[11px]"}`}>
              1–2 min · no commitment · shops often same day
            </p>
          </div>
        ) : null}

        {!priceLocked ? (
          <p className={`leading-snug text-secondary ${isCompact ? "mt-2 text-[10px]" : "mt-3 text-[11px]"}`}>
            Final quote may vary after inspection.
          </p>
        ) : null}

        {showAllCalculatorsCta && priceLocked ? (
          <div className={`${isCompact ? "mt-3" : "mt-4"}`}>
            <Link
              href="/calculators-subscription"
              className="inline-flex w-full items-center justify-center rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-primary shadow-sm hover:bg-muted/40 sm:w-auto"
            >
              Explore all shop calculators (subscription)
            </Link>
          </div>
        ) : null}

        <details
          className={`rounded-lg border border-border bg-card/40 [&_summary::-webkit-details-marker]:hidden ${
            isCompact ? "mt-2" : "mt-3"
          }`}
        >
          <summary
            className={`cursor-pointer list-none font-medium text-title hover:bg-card/80 ${
              isCompact ? "px-2 py-2 text-xs sm:px-3" : "px-3 py-2.5 text-sm sm:px-4"
            }`}
          >
            How this estimate is calculated — data sources & methodology
          </summary>
          <div
            className={`space-y-3 border-t border-border leading-snug text-secondary ${
              isCompact ? "px-2 pb-3 pt-2 text-[10px] sm:px-3" : "px-3 pb-4 pt-3 text-[11px] sm:px-4"
            }`}
          >
            <p>
              This calculator uses periodically refreshed <strong className="font-medium text-title">public benchmarks</strong>{" "}
              (commodity copper and motor-industry producer prices) to tune material input and the generic &quot;new
              motor&quot; comparison. If live data isn&apos;t available for a given refresh (for example, a feed outage),
              fixed reference values are used instead. Planning guidance only—not a shop quote.
            </p>

            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 rounded-md border border-border/80 bg-card/60 px-2.5 py-2">
              <span className="inline-flex flex-wrap items-center gap-x-1.5">
                <span className="text-secondary">Copper rate (model)</span>
                <span className="font-semibold tabular-nums text-title">{money(market.copperUsdPerKg)}/kg</span>
                {market.copperLive ? (
                  <span className="rounded bg-success/15 px-1 py-0 text-[9px] font-semibold uppercase tracking-wide text-success">
                    Live
                  </span>
                ) : (
                  <span className="text-[10px] text-secondary">reference</span>
                )}
              </span>
              <span className="inline-flex flex-wrap items-center gap-x-1.5">
                <span className="text-secondary">New-motor index factor</span>
                <span className="font-semibold tabular-nums text-title">
                  ×{Number(market.motorPpiMultiplier).toFixed(2)}
                </span>
                {market.motorLive ? (
                  <span className="rounded bg-success/15 px-1 py-0 text-[9px] font-semibold uppercase tracking-wide text-success">
                    Live
                  </span>
                ) : (
                  <span className="text-[10px] text-secondary">baseline</span>
                )}
              </span>
              {marketSnapshotShort ? (
                <span className="text-[10px] text-secondary">Snapshot {marketSnapshotShort}</span>
              ) : null}
            </div>

            {!priceLocked && (displayDerived?.copperLive || displayDerived?.motorLive) && (
              <ul className="list-disc space-y-1 pl-4 text-[11px] text-secondary">
                {displayDerived.copperLive ? (
                  <li>
                    Copper materials: IMF copper benchmark via{" "}
                    <abbr title="Federal Reserve Economic Data" className="cursor-help no-underline">
                      FRED
                    </abbr>{" "}
                    (USD/kg), with a wire-purchasing adjustment factor.
                  </li>
                ) : null}
                {displayDerived.motorLive ? (
                  <li>
                    New-motor comparison: U.S. producer price index for motor & generator manufacturing vs a configured
                    baseline index (also via FRED).
                  </li>
                ) : null}
              </ul>
            )}

            {!priceLocked && displayDerived?.breakdown ? (
              <div>
                <p className="font-medium text-title">Typical cost components (rule-of-thumb)</p>
                <ul className="mt-1.5 flex flex-wrap gap-x-5 gap-y-0.5">
                  <li>Copper/wire ~{money(displayDerived.breakdown.copperCost)}</li>
                  <li>Insulation ~{money(displayDerived.breakdown.materialCost)}</li>
                  <li>Labor ~{money(displayDerived.breakdown.laborUsd)}</li>
                </ul>
              </div>
            ) : priceLocked ? (
              <p className="text-[11px] text-secondary">
                Cost breakdown unlocks with the same single-use or monthly calculators access as the ballpark range
                above.
              </p>
            ) : null}

            {!priceLocked && displayDerived?.newMotorEstimate != null ? (
              <p className="text-[11px] text-secondary">
                <span className="font-medium text-title">Replacement benchmark (planning only):</span> generic new motor
                ~{moneyWhole(displayDerived.newMotorEstimate)}
                {displayDerived.motorLive ? " (index-adjusted)" : ""}; your band midpoint ~
                {moneyWhole((displayDerived.roughLow + displayDerived.roughHigh) / 2)}.
              </p>
            ) : null}

            {!priceLocked &&
            (displayDerived?.copperLive || displayDerived?.motorLive) &&
            (displayDerived?.copperSourceLabel || displayDerived?.motorSourceLabel) ? (
              <div className="rounded-md border border-border/80 bg-card/50 px-2 py-1.5 text-[10px] leading-snug">
                {displayDerived.copperLive && displayDerived.copperSourceLabel ? (
                  <span className="block">{displayDerived.copperSourceLabel}</span>
                ) : null}
                {displayDerived.motorLive && displayDerived.motorSourceLabel ? (
                  <span className="mt-0.5 block">{displayDerived.motorSourceLabel}</span>
                ) : null}
              </div>
            ) : null}
          </div>
        </details>
      </div>

      {requirePaidAccess ? (
        <CalculatorPaywallModal
          open={paywallOpen}
          onClose={() => setPaywallOpen(false)}
          showSingleUse
          allowGuestSingleUse={allowGuestSingleUse}
          nextPath={
            typeof window !== "undefined"
              ? `${window.location.pathname}${window.location.search || ""}${window.location.hash || ""}`
              : "/cost-of-motor-repair-and-rewinding"
          }
          pricing={{
            ...calcAccess.pricing,
            loginUrl: calcAccess.loginUrl,
            registerUrl: calcAccess.registerUrl,
          }}
        />
      ) : null}

      {!isDashboard ? (
        <LeadFormModal
          open={leadOpen}
          onClose={closeLeadModal}
          listing={null}
          prefill={leadPrefill}
          introTextOverride={leadIntroOverride ?? DEFAULT_LEAD_INTRO}
          calculatorFormSnapshot={leadIntroOverride ? null : form}
          calculatorSourcePage={calculatorSourcePage}
        />
      ) : null}
    </div>
  );
}
