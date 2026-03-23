import React, { useMemo, useState } from "react";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { num, fmt, CalcPanel, LabeledInput, ResultRow, Note, calcScreenStyles as S } from "./shared";

export default function SpeedDrivesScreen() {
  const insets = useSafeAreaInsets();
  const [freq, setFreq] = useState("60");
  const [poles, setPoles] = useState("4");

  const rpm = useMemo(() => {
    const f = num(freq);
    const p = num(poles);
    if (!Number.isFinite(f) || f <= 0) return null;
    if (!Number.isFinite(p) || p < 2 || p % 2 !== 0) return null;
    return (120 * f) / p;
  }, [freq, poles]);

  const [motorRpm, setMotorRpm] = useState("1750");
  const [dDriver, setDDriver] = useState("3");
  const [dDriven, setDDriven] = useState("6");

  const belt = useMemo(() => {
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
    <ScrollView style={S.scroll} contentContainerStyle={[S.content, { paddingBottom: insets.bottom + 24 }]}>
      <CalcPanel title="Synchronous speed (AC induction)">
        <LabeledInput label="Frequency (Hz)" value={freq} onChangeText={setFreq} keyboardType="decimal-pad" />
        <LabeledInput
          label="Poles (even, ≥ 2)"
          value={poles}
          onChangeText={setPoles}
          keyboardType="number-pad"
        />
        {rpm != null ? <ResultRow label="Synchronous speed" value={fmt(rpm, 0)} unit="RPM" /> : null}
        <Note>
          Actual motor speed is lower due to slip (e.g. ~1750 RPM at no load vs 1800 synchronous for 4-pole @ 60 Hz).
        </Note>
      </CalcPanel>

      <CalcPanel title="Belt / pulley driven speed">
        <LabeledInput label="Motor (driver) RPM" value={motorRpm} onChangeText={setMotorRpm} keyboardType="decimal-pad" />
        <LabeledInput
          label="Driver pulley Ø"
          value={dDriver}
          onChangeText={setDDriver}
          keyboardType="decimal-pad"
        />
        <LabeledInput label="Driven pulley Ø" value={dDriven} onChangeText={setDDriven} keyboardType="decimal-pad" />
        {belt ? (
          <>
            <ResultRow label="Driven shaft speed" value={fmt(belt.drivenRpm, 1)} unit="RPM" />
            <ResultRow label="Speed ratio (driver/driven)" value={fmt(belt.ratio, 4)} unit="" />
          </>
        ) : null}
        <Note>
          Assumes no slip. Use effective pitch diameter if timing belts; V-belt slip reduces driven speed slightly.
        </Note>
      </CalcPanel>
    </ScrollView>
  );
}
