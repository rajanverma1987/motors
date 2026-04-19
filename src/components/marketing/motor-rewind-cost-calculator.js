"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

  const problemDescription = `REQUEST — Motor rewinding quotes (MotorsWinding.com calculator)

WHAT I NEED
Qualified rewind / motor repair shops: please reply with a quote or offer to inspect. Local service or inbound freight is fine if you accept shipped cores.

MOTOR / WINDING (from calculator — verify against nameplate)
• Rating: ${ratingLine}
• Phase: ${phaseLabel}
• Voltage: ${form.voltage || "—"} V | RPM: ${form.rpm || "—"}
• Slots: ${form.slots} | AWG: ${form.wireGauge} | Coil type: ${coilLabel}
${copperLine}
BALLPARK (WEBSITE ONLY — NOT A BINDING QUOTE)
Calculator planning figure about ${money(breakdown.ballparkTotal)} USD (typical materials + labor band). Final price depends on inspection, core/slot damage, insulation class, varnish/VPI, bearings, balance, electrical tests, rush fees, and your shop rates.

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

export default function MotorRewindCostCalculator() {
  const [form, setForm] = useState(defaultForm);
  const [templateId, setTemplateId] = useState("");
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadPrefill, setLeadPrefill] = useState(null);

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

  return (
    <div className="not-prose rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
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
        <div className="mt-6">
          <Button type="button" variant="primary" size="lg" className="w-full sm:w-auto" onClick={openQuoteModal}>
            Get a quote from a winding shop in your area
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
