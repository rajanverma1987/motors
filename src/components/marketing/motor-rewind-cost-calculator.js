"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiPrinter } from "react-icons/fi";
import { computeCustomerRewindBallpark } from "@/lib/motor-rewind-cost/calculate";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import FormLayout, { Form, FormSectionTitle } from "@/components/ui/form-layout";
import LeadFormModal from "@/components/lead-form-modal";

const LS_DRAFT = "motorRewindCustomerDraft_v1";

const CALCULATOR_SOURCE_PAGE = "/electric-motor-rewinding-cost-calculator";

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
    label: "22 kW · 1800 RPM · 48 slot",
    patch: {
      ratingUnit: "kw",
      hp: "30",
      kw: "22",
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
    hp: "5",
    kw: "",
    phase: "3",
    voltage: "460",
    rpm: "1800",
    slots: "36",
    coilType: "lap",
    wireGauge: "14",
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

export function buildRewindCalculatorLeadPrefill(form, breakdown) {
  const hpLine =
    form.ratingUnit === "kw"
      ? `${form.kw || ""} kW (about ${breakdown.motorHp} HP equivalent)`
      : `${form.hp || ""} HP`;
  return {
    motorHp: hpLine,
    voltage: form.voltage ? `${form.voltage} V` : "",
    motorType: "AC motor rewinding",
    problemDescription:
      `I'd like quotes from rewinding shops in my area. ` +
      `The MotorsWinding ballpark calculator estimated about ${money(breakdown.ballparkTotal)} for this motor.\n\n` +
      `Details I entered: ${form.phase === "1" ? "Single-phase" : "Three-phase"}, ${form.rpm || "—"} RPM, ${form.slots} stator slots, AWG ${form.wireGauge}, ${form.coilType || "—"} coil.`,
  };
}

const STYLE_ID = "motor-rewind-customer-print-styles";
const PRINT_ROOT_CLASS = "motor-rewind-customer-print-root";

function injectPrintStyles() {
  if (typeof document === "undefined") return () => {};
  if (document.getElementById(STYLE_ID)) return () => {};
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @media print {
      body * { visibility: hidden !important; }
      .${PRINT_ROOT_CLASS},
      .${PRINT_ROOT_CLASS} * { visibility: visible !important; }
      .${PRINT_ROOT_CLASS} {
        position: fixed !important;
        left: 0 !important;
        top: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100% !important;
        min-height: 100% !important;
        overflow: visible !important;
        opacity: 1 !important;
        background: white !important;
        color: #111 !important;
        z-index: 2147483647 !important;
        padding: 1.5rem !important;
      }
    }
  `;
  document.head.appendChild(style);
  return () => {
    document.getElementById(STYLE_ID)?.remove();
  };
}

const OFFSCREEN_STYLE = {
  position: "fixed",
  left: "-100vw",
  top: 0,
  width: "8.5in",
  maxWidth: "100vw",
  opacity: 0,
  pointerEvents: "none",
  zIndex: -1,
  overflow: "hidden",
};

export default function MotorRewindCostCalculator() {
  const [form, setForm] = useState(defaultForm);
  const [templateId, setTemplateId] = useState("");
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadPrefill, setLeadPrefill] = useState(null);
  const [printPayload, setPrintPayload] = useState(null);
  const cleanupPrintRef = useRef(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- post-mount localStorage restore */
    try {
      const raw = localStorage.getItem(LS_DRAFT);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setForm((f) => ({ ...f, ...parsed }));
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

  const breakdown = useMemo(() => {
    return computeCustomerRewindBallpark({
      ...form,
      slots: Number(form.slots),
      voltage: Number(form.voltage),
    });
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
    setLeadPrefill(buildRewindCalculatorLeadPrefill(form, breakdown));
    setLeadOpen(true);
  }, [form, breakdown]);

  const triggerPrint = useCallback(() => {
    cleanupPrintRef.current?.();
    cleanupPrintRef.current = injectPrintStyles();
    setPrintPayload({ breakdown, form: { ...form }, at: new Date().toISOString() });
  }, [breakdown, form]);

  useLayoutEffect(() => {
    if (!printPayload) return undefined;
    let cancelled = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) window.print();
      });
    });
    const onAfterPrint = () => {
      setPrintPayload(null);
      cleanupPrintRef.current?.();
      cleanupPrintRef.current = null;
    };
    window.addEventListener("afterprint", onAfterPrint);
    return () => {
      cancelled = true;
      window.removeEventListener("afterprint", onAfterPrint);
    };
  }, [printPayload]);

  const printSheet =
    printPayload &&
    createPortal(
      <div className={PRINT_ROOT_CLASS} style={OFFSCREEN_STYLE} aria-hidden>
        <h1 style={{ fontSize: "1.2rem", marginBottom: "0.75rem" }}>Motor rewinding — ballpark estimate</h1>
        <p style={{ fontSize: "0.8rem", color: "#444" }}>{new Date(printPayload.at).toLocaleString()}</p>
        <p style={{ marginTop: "1rem", fontSize: "1.35rem", fontWeight: 700 }}>
          {money(printPayload.breakdown.ballparkTotal)}
        </p>
        <p style={{ fontSize: "0.85rem", marginTop: "0.5rem" }}>Equiv. HP: {printPayload.breakdown.motorHp}</p>
        <ul style={{ marginTop: "1rem", fontSize: "0.9rem", lineHeight: 1.6 }}>
          <li>Copper and wire (est.): {money(printPayload.breakdown.copperCost)}</li>
          <li>Insulation and varnish (est.): {money(printPayload.breakdown.materialCost)}</li>
          <li>Typical shop labor band (est.): {money(printPayload.breakdown.laborUsd)}</li>
        </ul>
        <p style={{ marginTop: "1.25rem", fontSize: "0.75rem", color: "#666" }}>
          Non-binding estimate for planning only. Shops quote after inspection.
        </p>
      </div>,
      document.body,
    );

  return (
    <div className="not-prose rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
      {printSheet}

      <div className="border-b border-border pb-4">
        <h1 className="text-xl font-semibold text-title sm:text-2xl">Electric motor rewinding cost calculator</h1>
        <p className="mt-2 text-sm text-secondary">
          Enter a few nameplate-style details for a quick US ballpark range. This is not a shop quote—actual price
          depends on inspection, damage, and the shop you choose.
        </p>
      </div>

      <Form id="motor-rewind-customer-form" className="mt-4 !border-0 !bg-transparent !p-0 !shadow-none" onSubmit={(e) => e.preventDefault()}>
        <FormSectionTitle as="h2" className="!mb-3 !text-base sm:!text-lg">
          Your motor
        </FormSectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Example motors"
            name="template"
            options={TEMPLATE_SELECT_OPTIONS}
            value={templateId}
            onChange={(e) => applyTemplate(e.target.value)}
            searchable={false}
          />
          <FormLayout cols={1} labelWidth="7.5rem" className="sm:col-span-1">
            <FormLayout.FormField label="Rating" name="ratingUnitRow">
              <div className="flex flex-wrap gap-4 py-1 text-sm text-title">
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="ratingUnit"
                    value="hp"
                    checked={form.ratingUnit === "hp"}
                    onChange={() => setForm((f) => ({ ...f, ratingUnit: "hp" }))}
                    className="h-4 w-4 accent-primary"
                  />
                  Horsepower (HP)
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="ratingUnit"
                    value="kw"
                    checked={form.ratingUnit === "kw"}
                    onChange={() => setForm((f) => ({ ...f, ratingUnit: "kw" }))}
                    className="h-4 w-4 accent-primary"
                  />
                  Kilowatts (kW)
                </label>
              </div>
            </FormLayout.FormField>
          </FormLayout>
          {form.ratingUnit === "hp" ? (
            <Select label="Motor HP" name="hp" options={HP_OPTIONS} value={form.hp} onChange={handleField("hp")} searchable={false} />
          ) : (
            <Input label="Motor kW" name="kw" type="number" step="0.01" min="0" value={form.kw} onChange={handleField("kw")} />
          )}
          <Select label="Phase" name="phase" options={PHASE_OPTIONS} value={form.phase} onChange={handleField("phase")} searchable={false} />
          <Select
            label="Voltage (nameplate)"
            name="voltage"
            options={VOLTAGE_OPTIONS}
            value={form.voltage}
            onChange={handleField("voltage")}
            searchable={false}
          />
          <Select label="RPM" name="rpm" options={RPM_OPTIONS} value={form.rpm} onChange={handleField("rpm")} searchable={false} />
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
          />
        </div>
      </Form>

      <div className="mt-8 rounded-lg border border-primary/25 bg-primary/[0.06] p-5 sm:p-6">
        <p className="text-sm font-medium text-secondary">Ballpark rewinding cost (USD)</p>
        <p className="mt-2 text-3xl font-bold tracking-tight text-title sm:text-4xl">{money(breakdown.ballparkTotal)}</p>
        <p className="mt-3 text-sm text-secondary">
          Built from typical copper and insulation allowances plus a common US shop labor band for your horsepower
          size. Real quotes vary—use this to plan before you talk to a shop.
        </p>
        <ul className="mt-4 space-y-1.5 text-sm text-secondary">
          <li>Copper and wire (estimate): {money(breakdown.copperCost)}</li>
          <li>Insulation and varnish (estimate): {money(breakdown.materialCost)}</li>
          <li>Typical labor band (estimate): {money(breakdown.laborUsd)}</li>
        </ul>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button type="button" variant="primary" size="lg" className="w-full sm:w-auto" onClick={openQuoteModal}>
            Get a quote from a winding shop in your area
          </Button>
          <Button type="button" variant="outline" size="lg" className="w-full gap-1.5 sm:w-auto" onClick={triggerPrint}>
            <FiPrinter className="h-4 w-4 shrink-0" aria-hidden />
            Print summary
          </Button>
        </div>
      </div>

      <LeadFormModal
        open={leadOpen}
        onClose={() => setLeadOpen(false)}
        listing={null}
        prefill={leadPrefill}
        introTextOverride="Request quotes from rewinding shops near you. Your details and calculator summary are sent to MotorsWinding so we can help match you with shops."
        calculatorFormSnapshot={form}
        calculatorSourcePage={CALCULATOR_SOURCE_PAGE}
      />
    </div>
  );
}
