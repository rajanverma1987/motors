import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Modal, ActivityIndicator, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTechAuth } from "../../TechAuthContext";
import { techFetch } from "../../api";
import { calculateCMBestMatch } from "../../lib/cm-calculator";
import { colors, spacing } from "../../theme";
import { num, fmt, CalcPanel, LabeledInput, Note } from "./shared";

const MAX_SELECT = 10;
const MAX_WIRES_CAP = 200;

function slotSize(row, i) {
  const q = row[`wires${i}`];
  if (!q || q <= 0) return "0";
  const s = row[`wireSize${i}`];
  return s != null && s !== "" ? String(s) : "0";
}

function slotQty(row, i) {
  const q = row[`wires${i}`];
  return q > 0 ? String(q) : "0";
}

function resultCardStyle(pct) {
  const a = Math.abs(Number(pct) || 0);
  if (a <= 2) return { backgroundColor: "hsl(152, 60%, 92%)" };
  if (a <= 10) return { backgroundColor: "hsl(45, 90%, 88%)" };
  return { backgroundColor: colors.formBg };
}

export default function CmBestMatchScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useTechAuth();
  const [wireRows, setWireRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(() => new Set());
  const [originalWiredInHand, setOriginalWiredInHand] = useState("");
  const [originalWireSize, setOriginalWireSize] = useState("");
  const [originalCM, setOriginalCM] = useState("");
  const [targetedCM, setTargetedCM] = useState("");
  const [minWires, setMinWires] = useState("3");
  const [maxWires, setMaxWires] = useState("10");
  const [results, setResults] = useState([]);
  const [resultContext, setResultContext] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadWires = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const list = await techFetch("/api/tech/wire-sizes", { token });
      const arr = Array.isArray(list) ? list : [];
      setWireRows(arr);
      setSelected((prev) => {
        const next = new Set();
        for (const row of arr) {
          if (row.id && prev.has(row.id)) next.add(row.id);
        }
        return next;
      });
    } catch (e) {
      Alert.alert("Could not load wires", e.message || "Try again.");
      setWireRows([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadWires();
  }, [loadWires]);

  const firstNIds = useMemo(() => wireRows.map((w) => w.id).filter(Boolean).slice(0, MAX_SELECT), [wireRows]);

  const allCatalogSelected = useMemo(() => {
    if (firstNIds.length === 0) return false;
    return firstNIds.every((id) => selected.has(id));
  }, [firstNIds, selected]);

  const selectedList = useMemo(() => wireRows.filter((w) => w.id && selected.has(w.id)), [wireRows, selected]);

  const wiresForCalc = useMemo(
    () => selectedList.map((w) => ({ size: w.size, cm: Number(w.circularMills) || 0 })).filter((w) => w.cm > 0),
    [selectedList]
  );

  const toggleId = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        if (next.size >= MAX_SELECT) {
          Alert.alert("Limit", `Select at most ${MAX_SELECT} wire sizes.`);
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allCatalogSelected) {
      setSelected(new Set());
      return;
    }
    const ids = wireRows.map((w) => w.id).filter(Boolean).slice(0, MAX_SELECT);
    setSelected(new Set(ids));
    if (wireRows.length > MAX_SELECT) {
      Alert.alert("Limit", `Only the first ${MAX_SELECT} sizes were selected.`);
    }
  };

  const runCalculate = () => {
    const t = num(targetedCM);
    const minW = Math.floor(num(minWires));
    const maxW = Math.floor(num(maxWires));

    if (!Number.isFinite(t) || t <= 0) {
      Alert.alert("Targeted CM", "Enter a valid targeted CM (circular mils).");
      return;
    }
    if (!Number.isFinite(minW) || !Number.isFinite(maxW)) {
      Alert.alert("Min / max wires", "Enter valid min and max wire counts.");
      return;
    }
    if (minW < 1 || maxW < minW) {
      Alert.alert("Min / max wires", "Min wires must be ≥ 1 and max wires must be ≥ min.");
      return;
    }
    if (maxW > MAX_WIRES_CAP) {
      Alert.alert("Max wires", `Max wires is capped at ${MAX_WIRES_CAP} for performance.`);
      return;
    }
    if (selectedList.length === 0) {
      Alert.alert("Catalog", "Select at least one wire size.");
      return;
    }
    if (wiresForCalc.length === 0) {
      Alert.alert("Catalog", "Selected wires need valid circular mils.");
      return;
    }

    const ocm = num(originalCM);
    const ctx = {
      originalWiredInHand: originalWiredInHand.trim() || "—",
      originalWireSize: originalWireSize.trim() || "—",
      originalCMDisplay: Number.isFinite(ocm) && ocm > 0 ? String(ocm) : "—",
      targetedCM: String(t),
      minWires: String(minW),
      maxWires: String(maxW),
      selectedCatalogSummary: selectedList.map((w) => `${w.size} (${w.circularMills} CM)`).join("; "),
    };
    setResultContext(ctx);

    const out = calculateCMBestMatch(wiresForCalc, t, minW, maxW);
    setResults(out);
    if (out.length === 0) {
      setModalOpen(false);
      Alert.alert("No matches", "No combinations within ±10% of target with the current limits.");
    } else {
      setModalOpen(true);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.intro}>
          Choose wire sizes from your shop catalog (managed in CRM). Enter targets and run the search.
        </Text>

        <Pressable style={({ pressed }) => [styles.calcBtn, pressed && styles.pressed]} onPress={runCalculate}>
          <Text style={styles.calcBtnText}>Calculate Best Match</Text>
        </Pressable>

        {results.length > 0 ? (
          <Pressable style={({ pressed }) => [styles.outlineBtn, pressed && styles.pressed]} onPress={() => setModalOpen(true)}>
            <Text style={styles.outlineBtnText}>View results ({results.length})</Text>
          </Pressable>
        ) : null}

        <CalcPanel title="Job inputs">
          <View style={styles.grid}>
            <LabeledInput
              label="Original Wires in Hand"
              value={originalWiredInHand}
              onChangeText={setOriginalWiredInHand}
              placeholder="10"
              keyboardType="numeric"
            />
            <LabeledInput
              label="Original Wire Size"
              value={originalWireSize}
              onChangeText={setOriginalWireSize}
              placeholder="19"
            />
            <LabeledInput
              label="Original CM"
              value={originalCM}
              onChangeText={setOriginalCM}
              placeholder="12360"
              keyboardType="decimal-pad"
            />
            <LabeledInput
              label="Targeted CM"
              value={targetedCM}
              onChangeText={setTargetedCM}
              placeholder="12360"
              keyboardType="decimal-pad"
            />
            <LabeledInput label="Min Wires" value={minWires} onChangeText={setMinWires} keyboardType="number-pad" />
            <LabeledInput label="Max Wires" value={maxWires} onChangeText={setMaxWires} keyboardType="number-pad" />
          </View>
        </CalcPanel>

        <CalcPanel title="Wire catalog">
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
          ) : wireRows.length === 0 ? (
            <Text style={styles.empty}>
              No wire sizes in your shop catalog. Add them in the CRM under Dashboard → Calculators → CM Best Match.
            </Text>
          ) : (
            <>
              <Pressable style={styles.selectAllRow} onPress={toggleSelectAll}>
                <Ionicons
                  name={allCatalogSelected ? "checkbox" : "square-outline"}
                  size={22}
                  color={colors.primary}
                />
                <Text style={styles.selectAllText}>Select all (up to {MAX_SELECT})</Text>
              </Pressable>
              <Text style={styles.countHint}>
                {selected.size} of {wireRows.length} selected
              </Text>
              {wireRows.map((w) => (
                <Pressable key={w.id || w.size} style={styles.wireRow} onPress={() => w.id && toggleId(w.id)}>
                  <Ionicons
                    name={w.id && selected.has(w.id) ? "checkbox" : "square-outline"}
                    size={22}
                    color={colors.primary}
                  />
                  <Text style={styles.wireSize}>{w.size}</Text>
                  <Text style={styles.wireCm}>{fmt(Number(w.circularMills) || 0, 0)} CM</Text>
                </Pressable>
              ))}
            </>
          )}
        </CalcPanel>

        <CalcPanel title="What each field means">
          <Note>
            Original fields are for your records on the results summary. Targeted CM is the goal (±10% search). Min/max
            wires limit total conductors in a combination (up to three sizes).
          </Note>
        </CalcPanel>
      </ScrollView>

      <Modal visible={modalOpen} animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, 12) + (Platform.OS === "ios" ? 0 : 8) }]}>
          <Text style={styles.modalTitle}>CM Best Match</Text>
          <Pressable onPress={() => setModalOpen(false)} hitSlop={12}>
            <Text style={styles.modalClose}>Done</Text>
          </Pressable>
        </View>
        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + 24 }}
        >
          {resultContext ? (
            <View style={styles.varsBox}>
              <Text style={styles.varsLine}>Original wires: {resultContext.originalWiredInHand}</Text>
              <Text style={styles.varsLine}>Original size: {resultContext.originalWireSize}</Text>
              <Text style={styles.varsLine}>Original CM: {resultContext.originalCMDisplay}</Text>
              <Text style={styles.varsLine}>Target: {resultContext.targetedCM} CM</Text>
              <Text style={styles.varsLine}>
                Min/max wires: {resultContext.minWires} / {resultContext.maxWires}
              </Text>
              {resultContext.selectedCatalogSummary ? (
                <Text style={styles.varsSmall}>Catalog: {resultContext.selectedCatalogSummary}</Text>
              ) : null}
            </View>
          ) : null}
          <Text style={styles.legend}>
            Green ≈ within 2% of target; yellow within 10%. Unused slots show 0.
          </Text>
          {results.map((row, idx) => (
            <View key={idx} style={[styles.card, resultCardStyle(row.percentDifference)]}>
              <Text style={styles.cardHead}>
                Total CM {fmt(row.totalCM, 0)} · {row.percentDifference > 0 ? "+" : ""}
                {row.percentDifference}% · {fmt(row.cmDifference, 0)} CM Δ
              </Text>
              <Text style={styles.cardLine}>
                Slots: {slotSize(row, 1)} × {slotQty(row, 1)} | {slotSize(row, 2)} × {slotQty(row, 2)} |{" "}
                {slotSize(row, 3)} × {slotQty(row, 3)}
              </Text>
              <Text style={styles.cardSmall}>
                Wires in hand: {row.wiresInHand} · No. of wires (display): {row.noOfWires}
              </Text>
            </View>
          ))}
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: spacing.lg },
  intro: { fontSize: 13, color: colors.secondary, lineHeight: 20, marginBottom: spacing.md },
  calcBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  outlineBtnText: { color: colors.primary, fontWeight: "700", fontSize: 15 },
  calcBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  pressed: { opacity: 0.88 },
  grid: { gap: 0 },
  empty: { fontSize: 14, color: colors.secondary, lineHeight: 21 },
  selectAllRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  selectAllText: { fontSize: 15, fontWeight: "600", color: colors.title },
  countHint: { fontSize: 12, color: colors.secondary, marginBottom: 8 },
  wireRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  wireSize: { flex: 1, fontSize: 16, fontWeight: "600", color: colors.title },
  wireCm: { fontSize: 14, color: colors.secondary },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.title },
  modalClose: { fontSize: 16, fontWeight: "700", color: colors.primary },
  modalScroll: { flex: 1, backgroundColor: colors.bg },
  varsBox: {
    backgroundColor: colors.formBg,
    padding: spacing.md,
    borderRadius: 10,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  varsLine: { fontSize: 14, color: colors.title, marginBottom: 4 },
  varsSmall: { fontSize: 12, color: colors.secondary, marginTop: 6, lineHeight: 18 },
  legend: { fontSize: 12, color: colors.secondary, marginBottom: spacing.md },
  card: {
    padding: spacing.md,
    borderRadius: 10,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHead: { fontSize: 14, fontWeight: "700", color: colors.title, marginBottom: 6 },
  cardLine: { fontSize: 13, color: colors.text, marginBottom: 4 },
  cardSmall: { fontSize: 12, color: colors.secondary },
});
