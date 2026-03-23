import React, { useMemo, useState } from "react";
import { Text, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  num,
  fmt,
  HP_TO_KW,
  CalcPanel,
  LabeledInput,
  ResultRow,
  Note,
  SegmentedTwo,
  calcScreenStyles as S,
} from "./shared";
import { colors, spacing } from "../../theme";

export default function TorqueScreen() {
  const insets = useSafeAreaInsets();
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
    <ScrollView style={S.scroll} contentContainerStyle={[S.content, { paddingBottom: insets.bottom + 24 }]}>
      <CalcPanel title="Torque from power & speed">
        <Text style={styles.fieldLabel}>Power input</Text>
        <SegmentedTwo
          a={{ value: "hp", label: "HP + RPM" }}
          b={{ value: "kw", label: "kW + RPM" }}
          value={mode}
          onChange={setMode}
        />
        {mode === "hp" ? (
          <LabeledInput label="Horsepower (HP)" value={hp} onChangeText={setHp} keyboardType="decimal-pad" />
        ) : (
          <LabeledInput label="Kilowatts (kW)" value={kw} onChangeText={setKw} keyboardType="decimal-pad" />
        )}
        <LabeledInput label="Speed (RPM)" value={rpm} onChangeText={setRpm} keyboardType="decimal-pad" />
        {out ? (
          <>
            <ResultRow label="Torque" value={fmt(out.lbFt, 2)} unit="lb-ft" />
            <ResultRow label="Torque" value={fmt(out.nm, 2)} unit="N·m" />
          </>
        ) : (
          <Note>Enter non-negative power and positive RPM.</Note>
        )}
        <Note>5252 ≈ 33000 / (2π); 9550 converts kW·min/rev to N·m. For rated torque, use rated power and speed.</Note>
      </CalcPanel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.secondary, marginBottom: spacing.sm },
});
