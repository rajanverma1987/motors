import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  FlatList,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import Ionicons from "@expo/vector-icons/Ionicons";
import { calculateCMBestMatch } from "../../lib/cm-calculator";
import { DEFAULT_WIRE_CATALOG } from "../../lib/default-wire-catalog";
import { SaveCalculationButton } from "./SaveCalculationButton";
import { colors, spacing } from "../../theme";
import { num, fmt, CalcPanel, LabeledInput, Note } from "./shared";
import { useMobileAuth } from "../../AuthContext";
import { appFetch } from "../../api";

const MAX_SELECT = 10;
const MAX_WIRES_CAP = 200;
const CUSTOM_WIRES_KEY = "motop_calcs_custom_wires";

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

function mergeCatalog(customWires) {
  const defaults = DEFAULT_WIRE_CATALOG.map((w) => ({ ...w, custom: false }));
  const extras = (Array.isArray(customWires) ? customWires : [])
    .filter((w) => w && w.id && w.size)
    .map((w) => ({
      id: String(w.id),
      size: String(w.size).trim(),
      circularMills: Number(w.circularMills) || 0,
      custom: true,
    }));
  return [...defaults, ...extras];
}

export default function CmBestMatchScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useMobileAuth();
  const [customWires, setCustomWires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingWire, setSavingWire] = useState(false);
  const [newSize, setNewSize] = useState("");
  const [newCm, setNewCm] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [originalWiredInHand, setOriginalWiredInHand] = useState("");
  const [originalWireSize, setOriginalWireSize] = useState("");
  const [originalCM, setOriginalCM] = useState("");
  const [targetedCM, setTargetedCM] = useState("");
  const [minWires, setMinWires] = useState("3");
  const [maxWires, setMaxWires] = useState("10");
  const [results, setResults] = useState([]);
  const [resultContext, setResultContext] = useState(null);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);

  const wireRows = useMemo(() => mergeCatalog(customWires), [customWires]);

  const persistCustom = useCallback(async (list) => {
    setCustomWires(list);
    try {
      await SecureStore.setItemAsync(CUSTOM_WIRES_KEY, JSON.stringify(list));
    } catch {
      /* ignore cache write */
    }
  }, []);

  const loadWires = useCallback(async () => {
    setLoading(true);
    try {
      const cached = await SecureStore.getItemAsync(CUSTOM_WIRES_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) setCustomWires(parsed);
        } catch {
          /* ignore */
        }
      }
      if (token) {
        const data = await appFetch("/api/mobile-app/wire-catalog", { token });
        const list = Array.isArray(data.customWires) ? data.customWires : [];
        await persistCustom(list);
      }
    } catch {
      /* keep defaults + any cached custom wires */
    } finally {
      setLoading(false);
    }
  }, [token, persistCustom]);

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

  const addWire = async () => {
    const size = newSize.trim();
    const cm = num(newCm);
    if (!size) {
      Alert.alert("Wire size", "Enter a size (e.g. 19 or 18.5).");
      return;
    }
    if (!Number.isFinite(cm) || cm <= 0) {
      Alert.alert("Circular mils", "Enter a positive circular mils value.");
      return;
    }
    const sizeKey = size.toLowerCase();
    if (wireRows.some((w) => String(w.size).trim().toLowerCase() === sizeKey)) {
      Alert.alert("Already listed", "That size is already in the catalog.");
      return;
    }
    setSavingWire(true);
    try {
      if (!token) throw new Error("Sign in required.");
      const data = await appFetch("/api/mobile-app/wire-catalog", {
        token,
        method: "POST",
        body: { size, circularMills: cm },
      });
      const list = Array.isArray(data.customWires) ? data.customWires : [...customWires, data.wire];
      await persistCustom(list);
      setNewSize("");
      setNewCm("");
      if (data.wire?.id && selected.size < MAX_SELECT) {
        setSelected((prev) => new Set(prev).add(data.wire.id));
      }
    } catch (e) {
      Alert.alert("Could not add", e.message || "Try again.");
    } finally {
      setSavingWire(false);
    }
  };

  const removeWire = (w) => {
    if (!w?.custom) return;
    Alert.alert("Remove wire", `Remove ${w.size} from your catalog? Default sizes stay.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            const data = await appFetch(`/api/mobile-app/wire-catalog?id=${encodeURIComponent(w.id)}`, {
              token,
              method: "DELETE",
            });
            const list = Array.isArray(data.customWires)
              ? data.customWires
              : customWires.filter((x) => x.id !== w.id);
            await persistCustom(list);
            setSelected((prev) => {
              const next = new Set(prev);
              next.delete(w.id);
              return next;
            });
          } catch (e) {
            Alert.alert("Could not remove", e.message || "Try again.");
          }
        },
      },
    ]);
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
      setResultsOpen(false);
      Alert.alert("No matches", "No combinations within ±10% of target with the current limits.");
    } else {
      setResultsOpen(true);
    }
  };

  const renderWire = ({ item: w }) => (
    <Pressable style={styles.wireRow} onPress={() => w.id && toggleId(w.id)}>
      <Ionicons
        name={w.id && selected.has(w.id) ? "checkbox" : "square-outline"}
        size={32}
        color={colors.primary}
      />
      <Text style={styles.wireSize}>{w.size}</Text>
      <Text style={styles.wireCm}>{fmt(Number(w.circularMills) || 0, 0)} CM</Text>
      {w.custom ? (
        <Pressable onPress={() => removeWire(w)} hitSlop={8} style={styles.trash}>
          <Ionicons name="trash-outline" size={24} color={colors.danger} />
        </Pressable>
      ) : (
        <View style={styles.trashPlaceholder} />
      )}
    </Pressable>
  );

  const selectedSummary =
    selectedList.length === 0 ? "No sizes selected" : selectedList.map((w) => w.size).join(", ");

  const modalPadTop = Math.max(insets.top, 12) + (Platform.OS === "ios" ? 0 : 8);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.mainContent, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.intro}>Select AWG sizes, enter targets, then calculate (±10% of targeted CM).</Text>

        <CalcPanel title="Job inputs" style={styles.compactPanel}>
          <View style={styles.row}>
            <LabeledInput
              compact
              style={styles.col}
              label="Orig. wires in hand"
              value={originalWiredInHand}
              onChangeText={setOriginalWiredInHand}
              placeholder="10"
              keyboardType="numeric"
            />
            <LabeledInput
              compact
              style={styles.col}
              label="Orig. wire size"
              value={originalWireSize}
              onChangeText={setOriginalWireSize}
              placeholder="19"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.row}>
            <LabeledInput
              compact
              style={styles.col}
              label="Original CM"
              value={originalCM}
              onChangeText={setOriginalCM}
              placeholder="12360"
              keyboardType="decimal-pad"
            />
            <LabeledInput
              compact
              style={styles.col}
              label="Targeted CM"
              value={targetedCM}
              onChangeText={setTargetedCM}
              placeholder="12360"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.rowLast}>
            <LabeledInput
              compact
              style={styles.col}
              label="Min wires"
              value={minWires}
              onChangeText={setMinWires}
              keyboardType="number-pad"
            />
            <LabeledInput
              compact
              style={styles.col}
              label="Max wires"
              value={maxWires}
              onChangeText={setMaxWires}
              keyboardType="number-pad"
            />
          </View>
        </CalcPanel>

        <CalcPanel title="Wire catalog" style={styles.catalogSummaryPanel}>
          <Text style={styles.countHint}>
            {selected.size} of {wireRows.length} selected
          </Text>
          <Text style={styles.selectedSummary} numberOfLines={3}>
            {selectedSummary}
          </Text>
          <Pressable
            style={({ pressed }) => [styles.catalogOpenBtn, pressed && styles.pressed]}
            onPress={() => setCatalogOpen(true)}
          >
            <Ionicons name="list-outline" size={22} color="#fff" />
            <Text style={styles.calcBtnText}>Select catalog</Text>
          </Pressable>
        </CalcPanel>

        <Pressable style={({ pressed }) => [styles.calcBtn, pressed && styles.pressed]} onPress={runCalculate}>
          <Text style={styles.calcBtnText}>Calculate Best Match</Text>
        </Pressable>

        {results.length > 0 ? (
          <Pressable
            style={({ pressed }) => [styles.outlineBtn, pressed && styles.pressed]}
            onPress={() => setResultsOpen(true)}
          >
            <Text style={styles.outlineBtnText}>View results ({results.length})</Text>
          </Pressable>
        ) : null}

        <SaveCalculationButton
          calculatorType="cm_best_match"
          title="CM Best Match"
          getPayload={() => ({
            title: resultContext
              ? `CM target ${resultContext.targetedCM} (${results.length} matches)`
              : "CM Best Match",
            inputs: {
              originalWiredInHand,
              originalWireSize,
              originalCM,
              targetedCM,
              minWires,
              maxWires,
              selectedIds: [...selected],
            },
            results: { count: results.length, context: resultContext, top: results.slice(0, 12) },
          })}
        />
        <Note>
          Original fields are notes on the results. Targeted CM is the search goal. Min/max limit total conductors (up
          to three sizes).
        </Note>
      </ScrollView>

      <Modal visible={catalogOpen} animationType="slide" onRequestClose={() => setCatalogOpen(false)}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modalHeader, { paddingTop: modalPadTop }]}>
            <Text style={styles.modalTitle}>Wire catalog</Text>
            <Pressable onPress={() => setCatalogOpen(false)} hitSlop={12}>
              <Text style={styles.modalClose}>Done</Text>
            </Pressable>
          </View>
          <View style={styles.catalogModalBody}>
            <View style={styles.addRow}>
              <LabeledInput
                compact
                style={styles.addSize}
                label="Size"
                value={newSize}
                onChangeText={setNewSize}
                placeholder="19"
              />
              <LabeledInput
                compact
                style={styles.addCm}
                label="CM"
                value={newCm}
                onChangeText={setNewCm}
                placeholder="12990"
                keyboardType="decimal-pad"
              />
              <Pressable
                onPress={addWire}
                disabled={savingWire}
                style={({ pressed }) => [styles.addBtn, pressed && styles.pressed, savingWire && styles.disabled]}
              >
                {savingWire ? <ActivityIndicator color="#fff" /> : <Text style={styles.addBtnText}>Add</Text>}
              </Pressable>
            </View>
            <Text style={styles.addHint}>Default AWG sizes stay. Add extra sizes you stock.</Text>
            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
            ) : (
              <>
                <Pressable style={styles.selectAllRow} onPress={toggleSelectAll}>
                  <Ionicons
                    name={allCatalogSelected ? "checkbox" : "square-outline"}
                    size={32}
                    color={colors.primary}
                  />
                  <Text style={styles.selectAllText}>Select all (up to {MAX_SELECT})</Text>
                </Pressable>
                <Text style={styles.countHint}>
                  {selected.size} of {wireRows.length} selected
                </Text>
                <FlatList
                  style={styles.catalogList}
                  data={wireRows}
                  keyExtractor={(w) => String(w.id || w.size)}
                  renderItem={renderWire}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
                  ListEmptyComponent={<Text style={styles.empty}>No wire sizes in the catalog.</Text>}
                />
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={resultsOpen} animationType="slide" onRequestClose={() => setResultsOpen(false)}>
        <View style={[styles.modalHeader, { paddingTop: modalPadTop }]}>
          <Text style={styles.modalTitle}>CM Best Match</Text>
          <Pressable onPress={() => setResultsOpen(false)} hitSlop={12}>
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
  flex: { flex: 1 },
  mainContent: { padding: spacing.md },
  intro: { fontSize: 12, color: colors.secondary, lineHeight: 17, marginBottom: spacing.sm },
  compactPanel: { padding: spacing.md, marginBottom: spacing.md },
  catalogSummaryPanel: { padding: spacing.md, marginBottom: spacing.md },
  catalogModalBody: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  catalogOpenBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 52,
  },
  selectedSummary: { fontSize: 16, color: colors.title, lineHeight: 22, marginBottom: spacing.md },
  row: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  rowLast: { flexDirection: "row", gap: spacing.sm },
  col: { flex: 1, minWidth: 0 },
  addRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, marginBottom: 6 },
  addSize: { flex: 1, minWidth: 0 },
  addCm: { flex: 1.2, minWidth: 0 },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 18 },
  addHint: { fontSize: 11, color: colors.secondary, marginBottom: 8 },
  catalogList: { flex: 1 },
  calcBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    minHeight: 52,
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  outlineBtnText: { color: colors.primary, fontWeight: "700", fontSize: 14 },
  calcBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.7 },
  empty: { fontSize: 14, color: colors.secondary, lineHeight: 21 },
  selectAllRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  selectAllText: { fontSize: 17, fontWeight: "600", color: colors.title },
  countHint: { fontSize: 13, color: colors.secondary, marginBottom: 8 },
  wireRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  wireSize: { flex: 1, fontSize: 18, fontWeight: "600", color: colors.title },
  wireCm: { fontSize: 16, color: colors.secondary },
  trash: { padding: 8 },
  trashPlaceholder: { width: 40 },
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
