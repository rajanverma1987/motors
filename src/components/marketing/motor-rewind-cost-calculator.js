"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiUpload } from "react-icons/fi";
import { computeCustomerRewindBallpark } from "@/lib/motor-rewind-cost/calculate";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import { Form, FormSectionTitle } from "@/components/ui/form-layout";
import LeadFormModal from "@/components/lead-form-modal";

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
  "Request quotes from rewinding shops near you. Your details and calculator summary are sent to MotorsWinding so we can help match you with shops.";

const NAMEPLATE_FAST_PATH_INTRO =
  "Don't know all the winding specs? Attach clear nameplate photos (and any failure notes). We'll route your request so shops can estimate or advise next steps.";

function estimateNewMotorReplacementUsd(motorHp) {
  const h = Number(motorHp);
  if (!Number.isFinite(h) || h <= 0) return null;
  return Math.round(350 + h * 98);
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

  const problemDescription = `REQUEST — Motor rewinding quotes (MotorsWinding.com calculator)

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

export default function MotorRewindCostCalculator({
  variant = "full",
  calculatorSourcePage = CALCULATOR_SOURCE_PAGE,
}) {
  const isEmbedded = variant === "embedded";
  const [form, setForm] = useState(defaultForm);
  const [templateId, setTemplateId] = useState("");
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadPrefill, setLeadPrefill] = useState(null);
  const [leadIntroOverride, setLeadIntroOverride] = useState(null);

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
    const breakdown = computeCustomerRewindBallpark({
      ...form,
      slots: Number(form.slots),
      voltage: Number(form.voltage),
    });
    const total = breakdown.ballparkTotal;
    const low = Math.round(total * RANGE_LOW_FACTOR * 100) / 100;
    const high = Math.round(total * RANGE_HIGH_FACTOR * 100) / 100;
    const midpoint = (low + high) / 2;
    const rough = roughBallparkBand(low, high);
    const motorHp = breakdown.motorHp;
    const newMotorEstimate = estimateNewMotorReplacementUsd(motorHp);
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
    };
  }, [form]);

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
    setLeadIntroOverride(null);
    setLeadPrefill(
      buildRewindCalculatorLeadPrefill(form, derived.breakdown, {
        low: derived.low,
        high: derived.high,
        replacementRecommended: derived.replacementRecommended,
      })
    );
    setLeadOpen(true);
  }, [form, derived]);

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

  return (
    <div
      className={`not-prose rounded-xl border border-border bg-card shadow-sm ${
        isEmbedded ? "p-3 sm:p-4 md:p-5" : "p-4 sm:p-6"
      }`}
    >
      <div className="border-b border-border pb-4">
        {isEmbedded ? (
          <h2 className="text-lg font-semibold text-title sm:text-xl">
            Electric motor rewinding cost calculator
          </h2>
        ) : (
          <h1 className="text-xl font-semibold text-title sm:text-2xl">
            Electric motor rewinding cost calculator
          </h1>
        )}
        <p className="mt-2 text-sm text-secondary">
          Adjust HP, phase, and optionally RPM—your estimate updates instantly. Not a shop quote; inspection may change
          scope and price.
        </p>
        <div className="mt-4">
          <button
            type="button"
            onClick={openNameplateFastPath}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-primary bg-transparent px-4 py-3 text-sm font-semibold text-primary shadow-sm transition-colors hover:bg-primary/10 sm:w-auto sm:justify-start"
          >
            <FiUpload className="h-4 w-4 shrink-0" aria-hidden />
            Upload nameplate for an estimate
          </button>
          <p className="mt-2 text-center text-xs text-secondary sm:text-left">No specs needed</p>
        </div>
      </div>

      <Form id="motor-rewind-customer-form" className="mt-4 !border-0 !bg-transparent !p-0 !shadow-none" onSubmit={(e) => e.preventDefault()}>
        <FormSectionTitle as="h2" className="!mb-3 !text-base sm:!text-lg">
          Your motor
        </FormSectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
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

        <details className="mt-5 rounded-lg border border-border bg-card/40 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-3 text-sm font-medium text-title hover:bg-card/80 sm:px-4">
            <span>Advanced details (optional)</span>
            <span className="text-xs font-normal text-secondary">Voltage, slots, coil, AWG, copper weight</span>
          </summary>
          <div className="grid gap-4 border-t border-border px-3 pb-4 pt-4 sm:grid-cols-2 sm:px-4">
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

      <div className="mt-8 rounded-xl border-2 border-primary/35 bg-gradient-to-b from-primary/[0.14] to-primary/[0.06] p-6 shadow-md sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Ballpark estimate (US)</p>
        <p className="mt-3 text-sm font-medium text-secondary">Estimated cost</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-title sm:text-4xl md:text-5xl">
          {moneyWhole(derived.roughLow)} – {moneyWhole(derived.roughHigh)}
        </p>
        <p className="mt-4 text-sm font-medium text-title">Typical turnaround: 2–5 business days</p>

        <p className="mt-3 text-xs text-secondary sm:text-sm">Based on typical US rewind shop pricing (2025)</p>

        {derived.fractionalHpNote ? (
          <p className="mt-3 rounded-md border border-border bg-card/80 px-3 py-2 text-sm text-secondary">
            Many shops charge a <strong className="text-title">minimum bench fee</strong> on fractional-HP motors—the
            total often reflects minimum labor more than copper alone.
          </p>
        ) : null}

        {derived.industrial ? (
          <p className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/[0.08] px-3 py-2 text-sm text-secondary">
            <strong className="text-title">Industrial / large motor:</strong> pricing is usually custom (special iron,
            insulation class, testing). Use the quote flow—shops typically confirm scope after review or inspection.
          </p>
        ) : null}

        <div
          className={`mt-5 rounded-md border px-3 py-3 text-sm font-medium ${
            derived.replacementRecommended
              ? "border-warning/40 bg-warning/[0.12] text-title"
              : "border-success/35 bg-success/[0.1] text-title"
          }`}
        >
          <p>
            Recommendation:{" "}
            {derived.replacementRecommended ? (
              <>Compare rewind vs new motor quotes before deciding.</>
            ) : (
              <>Rewinding is cost-effective at this range.</>
            )}
          </p>
          <p className="mt-1.5 text-xs font-normal text-secondary">
            {derived.replacementRecommended ? (
              <>Rule-of-thumb benchmark — verify with written quotes.</>
            ) : (
              <>{`(Typically <60% of new motor cost)`}</>
            )}
          </p>
        </div>

        <div className="mt-6">
          <Button type="button" variant="primary" size="lg" className="w-full sm:w-auto" onClick={openQuoteModal}>
            Get exact quote in 30 minutes
          </Button>
          <p className="mt-2 text-xs text-secondary sm:text-sm">Takes 1–2 minutes. No commitment.</p>
          <p className="mt-2 text-xs font-medium text-secondary sm:text-sm">Shops typically respond same day</p>
        </div>

        <ul className="mt-12 space-y-1 border-t border-primary/20 pt-6 text-xs text-secondary sm:text-sm">
          <li>Copper and wire (estimate): {money(derived.breakdown.copperCost)}</li>
          <li>Insulation and varnish (estimate): {money(derived.breakdown.materialCost)}</li>
          <li>Typical labor band (estimate): {money(derived.breakdown.laborUsd)}</li>
        </ul>

        <p className="mt-5 text-xs leading-relaxed text-secondary sm:text-sm">Final quote may vary after inspection.</p>
      </div>

      <LeadFormModal
        open={leadOpen}
        onClose={closeLeadModal}
        listing={null}
        prefill={leadPrefill}
        introTextOverride={leadIntroOverride ?? DEFAULT_LEAD_INTRO}
        calculatorFormSnapshot={leadIntroOverride ? null : form}
        calculatorSourcePage={calculatorSourcePage}
      />
    </div>
  );
}
