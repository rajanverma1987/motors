import React, { useMemo, useState } from "react";
import { Text, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  num,
  fmt,
  CalcPanel,
  LabeledInput,
  ResultRow,
  Note,
  SegmentedTwo,
  calcScreenStyles as S,
} from "./shared";
import { colors, spacing } from "../../theme";

export default function BenchElectricalScreen() {
  const insets = useSafeAreaInsets();
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
        return { error: "V = P = 0: use V+R or I+R pairs." };
      }
      ii = pp / vv;
      rr = vv / ii;
    } else if (ii != null && pp != null) {
      if (ii === 0 && pp > 0) return { error: "I = 0 and P > 0 is impossible." };
      if (ii === 0 && pp === 0) {
        return { error: "I = P = 0: use V+R or V+I pairs." };
      }
      vv = pp / ii;
      rr = vv / ii;
    } else if (rr != null && pp != null) {
      ii = Math.sqrt(pp / rr);
      vv = ii * rr;
    } else {
      return { error: "Need a valid pair (e.g. V+R, I+R, V+I, V+P, I+P, R+P)." };
    }

    if (vv != null && ii != null && rr != null && Math.abs(vv - ii * rr) > 1e-5 * Math.max(Math.abs(vv), 1)) {
      return { error: "Values are inconsistent with Ohm’s law (V = I×R)." };
    }
    if (vv != null && ii != null && pp != null && Math.abs(pp - vv * ii) > 1e-4 * Math.max(Math.abs(pp), 1)) {
      return { error: "Values are inconsistent with P = V×I." };
    }

    return { V: vv, I: ii, R: rr, P: pp };
  }, [v, i, r, p]);

  const [ra, setRa] = useState("10");
  const [rb, setRb] = useState("10");
  const [rc, setRc] = useState("10");
  const [mode, setMode] = useState("delta_to_wye");

  const deltaOut = useMemo(() => {
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
    <ScrollView style={S.scroll} contentContainerStyle={[S.content, { paddingBottom: insets.bottom + 24 }]}>
      <CalcPanel title="DC Ohm’s law & power">
        <Note>Enter any two of V, I, R, P; the rest update (leave unknowns blank).</Note>
        <LabeledInput label="Voltage (V)" value={v} onChangeText={setV} keyboardType="decimal-pad" />
        <LabeledInput label="Current (A)" value={i} onChangeText={setI} keyboardType="decimal-pad" />
        <LabeledInput label="Resistance (Ω)" value={r} onChangeText={setR} keyboardType="decimal-pad" />
        <LabeledInput label="Power (W)" value={p} onChangeText={setP} keyboardType="decimal-pad" />
        {"error" in solved && solved.error ? (
          <Text style={styles.warn}>{solved.error}</Text>
        ) : (
          <>
            <ResultRow label="Voltage" value={fmt(solved.V, 4)} unit="V" />
            <ResultRow label="Current" value={fmt(solved.I, 4)} unit="A" />
            <ResultRow label="Resistance" value={fmt(solved.R, 4)} unit="Ω" />
            <ResultRow label="Power" value={fmt(solved.P, 4)} unit="W" />
          </>
        )}
        <Note>For bench DC circuits. AC impedance and motor loads need different models.</Note>
      </CalcPanel>

      <CalcPanel title="3-phase resistor networks (Δ ↔ Y)">
        <Text style={styles.fieldLabel}>Conversion</Text>
        <SegmentedTwo
          a={{ value: "delta_to_wye", label: "Δ → Y" }}
          b={{ value: "wye_to_delta", label: "Y → Δ" }}
          value={mode}
          onChange={setMode}
        />
        <LabeledInput
          label={mode === "delta_to_wye" ? "R_AB (Δ edge A–B)" : "R_A (Y to A)"}
          value={ra}
          onChangeText={setRa}
          keyboardType="decimal-pad"
        />
        <LabeledInput
          label={mode === "delta_to_wye" ? "R_BC (Δ edge B–C)" : "R_B (Y to B)"}
          value={rb}
          onChangeText={setRb}
          keyboardType="decimal-pad"
        />
        <LabeledInput
          label={mode === "delta_to_wye" ? "R_CA (Δ edge C–A)" : "R_C (Y to C)"}
          value={rc}
          onChangeText={setRc}
          keyboardType="decimal-pad"
        />
        {deltaOut ? (
          <>
            <ResultRow label={deltaOut.labels[0]} value={fmt(deltaOut.r1, 4)} unit="Ω" />
            <ResultRow label={deltaOut.labels[1]} value={fmt(deltaOut.r2, 4)} unit="Ω" />
            <ResultRow label={deltaOut.labels[2]} value={fmt(deltaOut.r3, 4)} unit="Ω" />
          </>
        ) : (
          <Note>Enter three positive resistances.</Note>
        )}
        <Note>Useful for winding resistance work. Same unit for all values (e.g. Ω).</Note>
      </CalcPanel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.secondary, marginBottom: spacing.sm },
  warn: { fontSize: 14, color: colors.danger, marginTop: 8, lineHeight: 20 },
});
