import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  num,
  fmt,
  HP_TO_KW,
  W_PER_HP,
  SQRT3,
  CalcPanel,
  LabeledInput,
  ResultRow,
  Note,
  SegmentedTwo,
  calcScreenStyles as S,
} from "./shared";
import { colors, spacing } from "../../theme";

export default function PowerCurrentScreen() {
  const insets = useSafeAreaInsets();
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

  const [flaHp, setFlaHp] = useState("10");
  const [volts, setVolts] = useState("460");
  const [phase, setPhase] = useState("3");
  const [effPct, setEffPct] = useState("85");
  const [pf, setPf] = useState("0.85");

  const flaResult = useMemo(() => {
    const hpN2 = num(flaHp);
    const v = num(volts);
    const eff = num(effPct) / 100;
    const pfN = num(pf);
    if (!Number.isFinite(hpN2) || hpN2 <= 0) return null;
    if (!Number.isFinite(v) || v <= 0) return null;
    if (!Number.isFinite(eff) || eff <= 0 || eff > 1) return null;
    if (!Number.isFinite(pfN) || pfN <= 0 || pfN > 1) return null;
    const pOut = hpN2 * W_PER_HP;
    const pIn = pOut / eff;
    if (phase === "3") {
      const i = pIn / (SQRT3 * v * pfN);
      return { amps: i, note: "3-phase line current (balanced)" };
    }
    const i = pIn / (v * pfN);
    return { amps: i, note: "Single-phase line current" };
  }, [flaHp, volts, phase, effPct, pf]);

  return (
    <ScrollView style={S.scroll} contentContainerStyle={[S.content, { paddingBottom: insets.bottom + 24 }]}>
      <CalcPanel title="Horsepower ↔ kilowatts">
        <View style={S.row2}>
          <View style={S.flex1}>
            <LabeledInput label="Mechanical HP" value={hp} onChangeText={setHp} keyboardType="decimal-pad" />
            {fromHp != null ? <ResultRow label="≈ Kilowatts" value={fmt(fromHp, 4)} unit="kW" /> : null}
          </View>
          <View style={S.flex1}>
            <LabeledInput label="Kilowatts" value={kw} onChangeText={setKw} keyboardType="decimal-pad" />
            {fromKw != null ? <ResultRow label="≈ Horsepower" value={fmt(fromKw, 4)} unit="HP" /> : null}
          </View>
        </View>
        <Note>Uses 1 HP = 0.7457 kW (IEC-style conversion). Nameplate kW may differ slightly by standard.</Note>
      </CalcPanel>

      <CalcPanel title="Estimated full-load amps (FLA)">
        <LabeledInput label="Output power (HP)" value={flaHp} onChangeText={setFlaHp} keyboardType="decimal-pad" />
        <LabeledInput label="Voltage (V)" value={volts} onChangeText={setVolts} keyboardType="decimal-pad" />
        <Text style={styles.fieldLabel}>Phases</Text>
        <SegmentedTwo
          a={{ value: "3", label: "Three-phase" }}
          b={{ value: "1", label: "Single-phase" }}
          value={phase}
          onChange={setPhase}
        />
        <LabeledInput
          label="Efficiency (%)"
          value={effPct}
          onChangeText={setEffPct}
          keyboardType="decimal-pad"
        />
        <LabeledInput label="Power factor" value={pf} onChangeText={setPf} keyboardType="decimal-pad" />
        {flaResult ? (
          <>
            <ResultRow label="Approx. input current" value={fmt(flaResult.amps, 2)} unit="A" />
            <Note>{flaResult.note}</Note>
          </>
        ) : (
          <Note>Enter valid HP, voltage, efficiency (0–100%), and power factor (0–1).</Note>
        )}
        <Note>
          Rough estimate from output power, voltage, efficiency, and PF. Use nameplate FLA for protection and code.
        </Note>
      </CalcPanel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.secondary, marginBottom: spacing.sm },
});
