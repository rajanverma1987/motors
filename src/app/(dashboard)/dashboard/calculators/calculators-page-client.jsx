"use client";

import { useMemo, useState } from "react";
import Tabs from "@/components/ui/tabs";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import CmBestMatchCalculator from "@/components/dashboard/cm-best-match-calculator";

const SQRT3 = Math.sqrt(3);
const HP_TO_KW = 0.745699872;
const W_PER_HP = 746;

function num(v) {
  const n = parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function fmt(n, digits = 2) {
  if (n === null || n === undefined) return "—";
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: Number.isInteger(n) && Math.abs(n) < 1e6 ? 0 : digits,
  });
}

function Note({ children }) {
  return <p className="text-xs text-secondary leading-relaxed">{children}</p>;
}

function Panel({ title, children, className = "" }) {
  return (
    <section
      className={`rounded-lg border border-border bg-card p-5 shadow-sm dark:shadow-black/20 ${className}`}
    >
      {title ? <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-title">{title}</h2> : null}
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function ResultRow({ label, value, unit }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-md bg-muted/40 px-3 py-2 dark:bg-muted/20">
      <span className="text-sm text-secondary">{label}</span>
      <span className="font-mono text-sm font-semibold tabular-nums text-title">
        {value}
        {unit ? <span className="ml-1 font-sans font-normal text-secondary">{unit}</span> : null}
      </span>
    </div>
  );
}

/** HP ↔ kW */
function PowerConvertPanel() {
  const [hp, setHp] = useState("10");
  const [kw, setKw] = useState("");

  const hpN = num(hp);
  const kwN = num(kw);

  const fromHp = useMemo(() => {
    if (!Number.isFinite(hpN)) return null;
    return hpN * HP_TO_KW;
  }, [hpN]);

  const fromKw = useMemo(() => {
    if (!Number.isFinite(kwN)) return null;
    return kwN / HP_TO_KW;
  }, [kwN]);

  return (
    <Panel title="Horsepower ↔ kilowatts">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3">
          <Input label="Mechanical HP" type="text" inputMode="decimal" value={hp} onChange={(e) => setHp(e.target.value)} />
          {fromHp != null ? <ResultRow label="≈ Kilowatts" value={fmt(fromHp, 4)} unit="kW" /> : null}
        </div>
        <div className="space-y-3">
          <Input label="Kilowatts" type="text" inputMode="decimal" value={kw} onChange={(e) => setKw(e.target.value)} />
          {fromKw != null ? <ResultRow label="≈ Horsepower" value={fmt(fromKw, 4)} unit="HP" /> : null}
        </div>
      </div>
      <Note>Uses 1 HP = 0.7457 kW (IEC-style conversion). Nameplate kW may differ slightly by standard.</Note>
    </Panel>
  );
}

/** Estimated full-load amps (induction motor approximation) */
function FlaPanel() {
  const [hp, setHp] = useState("10");
  const [volts, setVolts] = useState("460");
  const [phase, setPhase] = useState("3");
  const [effPct, setEffPct] = useState("85");
  const [pf, setPf] = useState("0.85");

  const result = useMemo(() => {
    const hpN = num(hp);
    const v = num(volts);
    const eff = num(effPct) / 100;
    const pfN = num(pf);
    if (!Number.isFinite(hpN) || hpN <= 0) return null;
    if (!Number.isFinite(v) || v <= 0) return null;
    if (!Number.isFinite(eff) || eff <= 0 || eff > 1) return null;
    if (!Number.isFinite(pfN) || pfN <= 0 || pfN > 1) return null;
    const pOut = hpN * W_PER_HP;
    const pIn = pOut / eff;
    if (phase === "3") {
      const i = pIn / (SQRT3 * v * pfN);
      return { amps: i, note: "3-phase line current (balanced)" };
    }
    const i = pIn / (v * pfN);
    return { amps: i, note: "Single-phase line current" };
  }, [hp, volts, phase, effPct, pf]);

  return (
    <Panel title="Estimated full-load amps (FLA)">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Input label="Output power (HP)" type="text" inputMode="decimal" value={hp} onChange={(e) => setHp(e.target.value)} />
        <Input label="Voltage (V)" type="text" inputMode="decimal" value={volts} onChange={(e) => setVolts(e.target.value)} />
        <Select
          label="Phases"
          options={[
            { value: "3", label: "Three-phase" },
            { value: "1", label: "Single-phase" },
          ]}
          value={phase}
          onChange={(e) => setPhase(e.target.value ?? "3")}
          searchable={false}
        />
        <Input
          label="Efficiency (%)"
          type="text"
          inputMode="decimal"
          value={effPct}
          onChange={(e) => setEffPct(e.target.value)}
          help="Typical 75–95% for modern motors"
        />
        <Input
          label="Power factor"
          type="text"
          inputMode="decimal"
          value={pf}
          onChange={(e) => setPf(e.target.value)}
          help="Often 0.80–0.90 at full load"
        />
      </div>
      {result ? (
        <>
          <ResultRow label="Approx. input current" value={fmt(result.amps, 2)} unit="A" />
          <p className="text-xs text-secondary">{result.note}</p>
        </>
      ) : (
        <p className="text-sm text-secondary">Enter valid HP, voltage, efficiency (0–100%), and power factor (0–1).</p>
      )}
      <Note>
        This is a rough estimate from output power, voltage, efficiency, and PF. Always use the nameplate FLA for
        overload protection, wire sizing per code, and starter selection.
      </Note>
    </Panel>
  );
}

/** Synchronous speed */
function SyncSpeedPanel() {
  const [freq, setFreq] = useState("60");
  const [poles, setPoles] = useState("4");

  const rpm = useMemo(() => {
    const f = num(freq);
    const p = num(poles);
    if (!Number.isFinite(f) || f <= 0) return null;
    if (!Number.isFinite(p) || p < 2 || p % 2 !== 0) return null;
    return (120 * f) / p;
  }, [freq, poles]);

  return (
    <Panel title="Synchronous speed (AC induction)">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Frequency (Hz)" type="text" inputMode="decimal" value={freq} onChange={(e) => setFreq(e.target.value)} />
        <Select
          label="Poles"
          options={["2", "4", "6", "8", "10", "12"].map((p) => ({ value: p, label: `${p}-pole` }))}
          value={poles}
          onChange={(e) => setPoles(e.target.value ?? "4")}
          searchable={false}
        />
      </div>
      {rpm != null ? <ResultRow label="Synchronous speed" value={fmt(rpm, 0)} unit="RPM" /> : null}
      <Note>
        Actual motor speed is lower due to slip (e.g. ~1750 RPM at no load vs 1800 synchronous for 4-pole @ 60 Hz).
      </Note>
    </Panel>
  );
}

/** Torque from power and speed */
function TorquePanel() {
  const [mode, setMode] = useState("hp");
  const [hp, setHp] = useState("10");
  const [kw, setKw] = useState("7.5");
  const [rpm, setRpm] = useState("1750");

  const out = useMemo(() => {
    const n = num(rpm);
    if (!Number.isFinite(n) || n <= 0) return null;
    if (mode === "hp") {
      const h = num(hp);
      if (!Number.isFinite(h) || h < 0) return null;
      const lbFt = (5252 * h) / n;
      const kW = h * HP_TO_KW;
      const nm = (9550 * kW) / n;
      return { lbFt, nm };
    }
    const k = num(kw);
    if (!Number.isFinite(k) || k < 0) return null;
    const nm = (9550 * k) / n;
    const h = k / HP_TO_KW;
    const lbFt = (5252 * h) / n;
    return { lbFt, nm };
  }, [mode, hp, kw, rpm]);

  return (
    <Panel title="Torque from power & speed">
      <Select
        label="Power input"
        options={[
          { value: "hp", label: "Horsepower + RPM" },
          { value: "kw", label: "Kilowatts + RPM" },
        ]}
        value={mode}
        onChange={(e) => setMode(e.target.value ?? "hp")}
        searchable={false}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {mode === "hp" ? (
          <Input label="Horsepower (HP)" type="text" inputMode="decimal" value={hp} onChange={(e) => setHp(e.target.value)} />
        ) : (
          <Input label="Kilowatts (kW)" type="text" inputMode="decimal" value={kw} onChange={(e) => setKw(e.target.value)} />
        )}
        <Input label="Speed (RPM)" type="text" inputMode="decimal" value={rpm} onChange={(e) => setRpm(e.target.value)} />
      </div>
      {out ? (
        <div className="flex flex-col gap-2">
          <ResultRow label="Torque" value={fmt(out.lbFt, 2)} unit="lb-ft" />
          <ResultRow label="Torque" value={fmt(out.nm, 2)} unit="N·m" />
        </div>
      ) : (
        <p className="text-sm text-secondary">Enter non-negative power and positive RPM.</p>
      )}
      <Note>5252 ≈ 33000 / (2π); 9550 converts kW·min/rev to N·m. For rated torque, use rated power and rated speed.</Note>
    </Panel>
  );
}

/** Belt / pulley RPM */
function BeltDrivePanel() {
  const [motorRpm, setMotorRpm] = useState("1750");
  const [dDriver, setDDriver] = useState("3");
  const [dDriven, setDDriven] = useState("6");

  const out = useMemo(() => {
    const n = num(motorRpm);
    const d1 = num(dDriver);
    const d2 = num(dDriven);
    if (!Number.isFinite(n) || n <= 0) return null;
    if (!Number.isFinite(d1) || d1 <= 0) return null;
    if (!Number.isFinite(d2) || d2 <= 0) return null;
    const ratio = d1 / d2;
    const drivenRpm = n * ratio;
    return { drivenRpm, ratio };
  }, [motorRpm, dDriver, dDriven]);

  return (
    <Panel title="Belt / pulley driven speed">
      <div className="grid gap-3 sm:grid-cols-3">
        <Input label="Motor (driver) RPM" type="text" inputMode="decimal" value={motorRpm} onChange={(e) => setMotorRpm(e.target.value)} />
        <Input
          label="Driver pulley Ø"
          type="text"
          inputMode="decimal"
          value={dDriver}
          onChange={(e) => setDDriver(e.target.value)}
          help="Same units as driven"
        />
        <Input label="Driven pulley Ø" type="text" inputMode="decimal" value={dDriven} onChange={(e) => setDDriven(e.target.value)} />
      </div>
      {out ? (
        <div className="flex flex-col gap-2">
          <ResultRow label="Driven shaft speed" value={fmt(out.drivenRpm, 1)} unit="RPM" />
          <ResultRow label="Speed ratio (driver/driven)" value={fmt(out.ratio, 4)} unit="" />
        </div>
      ) : null}
      <Note>
        Assumes no slip. Use effective pitch diameter if timing belts; V-belt slip reduces driven speed slightly.
      </Note>
    </Panel>
  );
}

/** DC Ohm's law */
function OhmsLawPanel() {
  const [v, setV] = useState("120");
  const [i, setI] = useState("");
  const [r, setR] = useState("10");
  const [p, setP] = useState("");

  const solved = useMemo(() => {
    const V = num(v);
    const I = num(i);
    const R = num(r);
    const P = num(p);
    const hasV = Number.isFinite(V) && V >= 0;
    const hasI = Number.isFinite(I) && I >= 0;
    const hasR = Number.isFinite(R) && R > 0;
    const hasP = Number.isFinite(P) && P >= 0;
    const count = [hasV, hasI, hasR, hasP].filter(Boolean).length;
    if (count < 2) return { error: "Enter at least two of V, I, R, P (R must be > 0 when used)." };

    let vv = hasV ? V : null;
    let ii = hasI ? I : null;
    let rr = hasR ? R : null;
    let pp = hasP ? P : null;

    if (vv != null && rr != null) {
      ii = vv / rr;
      pp = vv * ii;
    } else if (ii != null && rr != null) {
      vv = ii * rr;
      pp = vv * ii;
    } else if (vv != null && ii != null) {
      rr = vv / ii;
      pp = vv * ii;
    } else if (vv != null && pp != null) {
      if (vv === 0 && pp > 0) return { error: "V = 0 and P > 0 is impossible." };
      if (vv === 0 && pp === 0) {
        return { error: "V = P = 0: current is 0 Ω but resistance is undefined (use V+R or I+R)." };
      }
      ii = pp / vv;
      rr = vv / ii;
    } else if (ii != null && pp != null) {
      if (ii === 0 && pp > 0) return { error: "I = 0 and P > 0 is impossible." };
      if (ii === 0 && pp === 0) {
        return { error: "I = P = 0: voltage is 0 V but resistance is undefined (use V+R or V+I)." };
      }
      vv = pp / ii;
      rr = vv / ii;
    } else if (rr != null && pp != null) {
      ii = Math.sqrt(pp / rr);
      vv = ii * rr;
    } else {
      return { error: "Need a valid pair (e.g. V+R, I+R, V+I, V+P, I+P, R+P)." };
    }

    if (vv != null && ii != null && rr != null && Math.abs(vv - ii * rr) > 1e-5 * Math.max(Math.abs(vv), 1))
      return { error: "Values are inconsistent with Ohm’s law (V = I×R)." };
    if (vv != null && ii != null && pp != null && Math.abs(pp - vv * ii) > 1e-4 * Math.max(Math.abs(pp), 1))
      return { error: "Values are inconsistent with P = V×I." };

    return { V: vv, I: ii, R: rr, P: pp };
  }, [v, i, r, p]);

  return (
    <Panel title="DC Ohm’s law & power">
      <p className="text-sm text-secondary">Enter any two of V, I, R, P; the rest update (leave unknowns blank or zero).</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input label="Voltage (V)" type="text" inputMode="decimal" value={v} onChange={(e) => setV(e.target.value)} />
        <Input label="Current (A)" type="text" inputMode="decimal" value={i} onChange={(e) => setI(e.target.value)} />
        <Input label="Resistance (Ω)" type="text" inputMode="decimal" value={r} onChange={(e) => setR(e.target.value)} />
        <Input label="Power (W)" type="text" inputMode="decimal" value={p} onChange={(e) => setP(e.target.value)} />
      </div>
      {"error" in solved && solved.error ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">{solved.error}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <ResultRow label="Voltage" value={fmt(solved.V, 4)} unit="V" />
          <ResultRow label="Current" value={fmt(solved.I, 4)} unit="A" />
          <ResultRow label="Resistance" value={fmt(solved.R, 4)} unit="Ω" />
          <ResultRow label="Power" value={fmt(solved.P, 4)} unit="W" />
        </div>
      )}
      <Note>For bench DC circuits. AC impedance and motor loads need different models.</Note>
    </Panel>
  );
}

/** Delta ↔ Wye equivalent resistance
 * Delta edges: R_AB, R_BC, R_CA. Wye legs from center: R_A, R_B, R_C to terminals A,B,C.
 */
function DeltaWyePanel() {
  const [ra, setRa] = useState("10");
  const [rb, setRb] = useState("10");
  const [rc, setRc] = useState("10");
  const [mode, setMode] = useState("delta_to_wye");

  const out = useMemo(() => {
    const rAB = num(ra);
    const rBC = num(rb);
    const rCA = num(rc);
    if (![rAB, rBC, rCA].every((x) => Number.isFinite(x) && x > 0)) return null;
    if (mode === "delta_to_wye") {
      const sum = rAB + rBC + rCA;
      return {
        r1: (rAB * rCA) / sum,
        r2: (rAB * rBC) / sum,
        r3: (rBC * rCA) / sum,
        labels: ["R_A (Y leg to A)", "R_B (Y leg to B)", "R_C (Y leg to C)"],
      };
    }
    const Ra = rAB;
    const Rb = rBC;
    const Rc = rCA;
    const denom = Ra * Rb + Rb * Rc + Rc * Ra;
    return {
      r1: denom / Rc,
      r2: denom / Ra,
      r3: denom / Rb,
      labels: ["R_AB (Δ)", "R_BC (Δ)", "R_CA (Δ)"],
    };
  }, [ra, rb, rc, mode]);

  return (
    <Panel title="3-phase resistor networks (Δ ↔ Y)">
      <Select
        label="Conversion"
        options={[
          { value: "delta_to_wye", label: "Delta (Δ) → Wye (Y)" },
          { value: "wye_to_delta", label: "Wye (Y) → Delta (Δ)" },
        ]}
        value={mode}
        onChange={(e) => setMode(e.target.value ?? "delta_to_wye")}
        searchable={false}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          label={mode === "delta_to_wye" ? "R_AB (Δ edge A–B)" : "R_A (Y to terminal A)"}
          type="text"
          inputMode="decimal"
          value={ra}
          onChange={(e) => setRa(e.target.value)}
        />
        <Input
          label={mode === "delta_to_wye" ? "R_BC (Δ edge B–C)" : "R_B (Y to terminal B)"}
          type="text"
          inputMode="decimal"
          value={rb}
          onChange={(e) => setRb(e.target.value)}
        />
        <Input
          label={mode === "delta_to_wye" ? "R_CA (Δ edge C–A)" : "R_C (Y to terminal C)"}
          type="text"
          inputMode="decimal"
          value={rc}
          onChange={(e) => setRc(e.target.value)}
        />
      </div>
      {out ? (
        <div className="flex flex-col gap-2">
          <ResultRow label={out.labels[0]} value={fmt(out.r1, 4)} unit="Ω" />
          <ResultRow label={out.labels[1]} value={fmt(out.r2, 4)} unit="Ω" />
          <ResultRow label={out.labels[2]} value={fmt(out.r3, 4)} unit="Ω" />
        </div>
      ) : (
        <p className="text-sm text-secondary">Enter three positive resistances.</p>
      )}
      <Note>Useful for winding resistance and equivalent-circuit work. Use the same unit for all values (e.g. Ω).</Note>
    </Panel>
  );
}

export default function CalculatorsPageClient() {
  const tabs = useMemo(
    () => [
      {
        id: "cm_best_match",
        label: "CM Best Match",
        children: <CmBestMatchCalculator />,
      },
      {
        id: "power",
        label: "Power & current",
        children: (
          <div className="flex max-w-4xl flex-col gap-6">
            <PowerConvertPanel />
            <FlaPanel />
          </div>
        ),
      },
      {
        id: "speed",
        label: "Speed & drives",
        children: (
          <div className="flex max-w-4xl flex-col gap-6">
            <SyncSpeedPanel />
            <BeltDrivePanel />
          </div>
        ),
      },
      {
        id: "torque",
        label: "Torque",
        children: (
          <div className="flex max-w-3xl flex-col gap-6">
            <TorquePanel />
          </div>
        ),
      },
      {
        id: "electrical",
        label: "Bench electrical",
        children: (
          <div className="flex max-w-5xl flex-col gap-6">
            <OhmsLawPanel />
            <DeltaWyePanel />
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-1 flex-col overflow-hidden px-4 py-6">
      <header className="mb-6 shrink-0 border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-title">Calculators</h1>
        <p className="mt-1 max-w-3xl text-sm text-secondary">
          Quick reference tools for motor shops—power conversion, FLA estimates, speed, torque, bench DC math, and
          circular-mil winding combinations. Results are for estimation; always follow NEC/local code and nameplate data
          in the field.
        </p>
      </header>
      <div className="min-h-0 flex-1 overflow-auto pb-8">
        <Tabs tabs={tabs} defaultTab="cm_best_match" listClassName="gap-x-0" />
      </div>
    </div>
  );
}
