import React from "react";
import { View, Text, TextInput, StyleSheet, Pressable } from "react-native";
import { colors, spacing } from "../../theme";

export function num(v) {
  const n = parseFloat(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

export function fmt(n, digits = 2) {
  if (n === null || n === undefined) return "—";
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: Number.isInteger(n) && Math.abs(n) < 1e6 ? 0 : digits,
  });
}

export const SQRT3 = Math.sqrt(3);
export const HP_TO_KW = 0.745699872;
export const W_PER_HP = 746;

export function CalcPanel({ title, children, style }) {
  return (
    <View style={[styles.panel, style]}>
      {title ? <Text style={styles.panelTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function LabeledInput({ label, value, onChangeText, keyboardType = "default", ...rest }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.secondary}
        keyboardType={keyboardType}
        {...rest}
      />
    </View>
  );
}

export function ResultRow({ label, value, unit }) {
  return (
    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={styles.resultValue}>
        {value}
        {unit ? <Text style={styles.resultUnit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

export function Note({ children }) {
  return <Text style={styles.note}>{children}</Text>;
}

/** Two-option segmented control */
export function SegmentedTwo({ a, b, value, onChange }) {
  return (
    <View style={styles.segmentWrap}>
      <Pressable
        onPress={() => onChange(a.value)}
        style={[styles.segmentBtn, value === a.value && styles.segmentBtnActive]}
      >
        <Text style={[styles.segmentText, value === a.value && styles.segmentTextActive]}>{a.label}</Text>
      </Pressable>
      <Pressable
        onPress={() => onChange(b.value)}
        style={[styles.segmentBtn, value === b.value && styles.segmentBtnActive]}
      >
        <Text style={[styles.segmentText, value === b.value && styles.segmentTextActive]}>{b.label}</Text>
      </Pressable>
    </View>
  );
}

export const calcScreenStyles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 40 },
  screenTitle: { fontSize: 18, fontWeight: "700", color: colors.title, marginBottom: spacing.sm },
  screenHint: { fontSize: 13, color: colors.secondary, marginBottom: spacing.lg, lineHeight: 20 },
  row2: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  row3: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  flex1: { flex: 1, minWidth: 140 },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  panelTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.title,
    marginBottom: spacing.md,
  },
  field: { marginBottom: spacing.md },
  label: { fontSize: 13, fontWeight: "600", color: colors.secondary, marginBottom: 6 },
  input: {
    backgroundColor: colors.formBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.title,
  },
  resultRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 8,
    backgroundColor: "hsl(28, 12%, 94%)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  resultLabel: { fontSize: 14, color: colors.secondary },
  resultValue: { fontSize: 15, fontWeight: "700", color: colors.title },
  resultUnit: { fontWeight: "400", color: colors.secondary },
  note: { fontSize: 12, color: colors.secondary, lineHeight: 18, marginTop: 4 },
  segmentWrap: { flexDirection: "row", gap: 8, marginBottom: spacing.md },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.formBg,
    alignItems: "center",
  },
  segmentBtnActive: { borderColor: colors.primary, backgroundColor: "hsl(26, 40%, 92%)" },
  segmentText: { fontSize: 13, fontWeight: "600", color: colors.secondary },
  segmentTextActive: { color: colors.primary },
});
