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
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import Ionicons from "@expo/vector-icons/Ionicons";
import { calculateCMBestMatch } from "../../lib/cm-calculator";
import {
  CIR_MILLS_UNIT_AWG,
  CIR_MILLS_UNIT_METRIC,
  DEFAULT_CIR_MILLS_ROWS,
  DEFAULT_METRIC_CIR_MILLS_ROWS,
  formatOriginalWireSelection,
  normalizeCirMillsUnit,
} from "../../lib/platform-cir-mills";
import { emailCmResults, printCmResults } from "../../lib/cm-result-share";
import { SaveCalculationButton } from "./SaveCalculationButton";
import { colors, spacing } from "../../theme";
import { num, fmt, CalcPanel, LabeledInput, Note, SegmentedTwo } from "./shared";
import { useMobileAuth } from "../../AuthContext";
import { appFetch } from "../../api";

const MAX_SELECT = 10;
const MAX_WIRES_CAP = 200;
const RESULTS_PAGE_SIZE = 200;
const CUSTOM_WIRES_KEY = "motop_calcs_custom_wires";

function platformId(unit, size) {
  return `${normalizeCirMillsUnit(unit)}-${String(size)}`;
}

function buildPlatformRows(unit) {
  const u = normalizeCirMillsUnit(unit);
  const seed = u === CIR_MILLS_UNIT_METRIC ? DEFAULT_METRIC_CIR_MILLS_ROWS : DEFAULT_CIR_MILLS_ROWS;
  return seed.map((w) => ({
    id: platformId(u, w.size),
    size: String(w.size),
    circularMills: Number(w.circularMills) || 0,
    source: "platform",
    wireUnit: u,
    custom: false,
  }));
}

function resultRowBg(pct) {
  const a = Math.abs(Number(pct) || 0);
  if (a <= 2) return "hsl(152, 60%, 92%)";
  if (a <= 5) return "hsl(45, 90%, 88%)";
  return colors.formBg;
}

function emptyDash(v) {
  const s = String(v ?? "").trim();
  return s || "-";
}

export default function CmBestMatchScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useMobileAuth();
  const [customWires, setCustomWires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingWire, setSavingWire] = useState(false);
  const [catalogUnit, setCatalogUnit] = useState(CIR_MILLS_UNIT_AWG);
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
  const [resultsTitle, setResultsTitle] = useState("CM Best Match");
  const [resultsPage, setResultsPage] = useState(1);
  const [savedOpen, setSavedOpen] = useState(false);
  const [savedItems, setSavedItems] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [pageTab, setPageTab] = useState("catalog"); // catalog | original
  const [originalPickerOpen, setOriginalPickerOpen] = useState(false);
  const [pickerUnit, setPickerUnit] = useState(CIR_MILLS_UNIT_AWG);
  const [originalWireQtys, setOriginalWireQtys] = useState({});
  const [sharing, setSharing] = useState("");

  const unitLabel = catalogUnit === CIR_MILLS_UNIT_METRIC ? "Metric" : "AWG";
  const sizeColumnLabel =
    catalogUnit === CIR_MILLS_UNIT_METRIC ? "Wire size (mm)" : "Wire size (AWG)";

  const platformRows = useMemo(() => buildPlatformRows(catalogUnit), [catalogUnit]);
  const allPlatformRows = useMemo(
    () => [...buildPlatformRows(CIR_MILLS_UNIT_AWG), ...buildPlatformRows(CIR_MILLS_UNIT_METRIC)],
    []
  );

  const customRows = useMemo(
    () =>
      (Array.isArray(customWires) ? customWires : [])
        .filter((w) => w && w.id && w.size)
        .map((w) => ({
          id: String(w.id),
          size: String(w.size).trim(),
          circularMills: Number(w.circularMills) || 0,
          source: "custom",
          custom: true,
        })),
    [customWires]
  );

  const catalogRows = useMemo(() => [...platformRows, ...customRows], [platformRows, customRows]);
  const allSelectableRows = useMemo(
    () => [...allPlatformRows, ...customRows],
    [allPlatformRows, customRows]
  );

  const persistCustom = useCallback(async (list) => {
    setCustomWires(list);
    try {
      await SecureStore.setItemAsync(CUSTOM_WIRES_KEY, JSON.stringify(list));
    } catch {
      /* ignore */
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
      /* keep defaults + cache */
    } finally {
      setLoading(false);
    }
  }, [token, persistCustom]);

  useEffect(() => {
    loadWires();
  }, [loadWires]);

  const selectedList = useMemo(
    () => allSelectableRows.filter((w) => w.id && selected.has(w.id)),
    [allSelectableRows, selected]
  );

  const selectedOnCurrentList = useMemo(
    () => catalogRows.filter((w) => w.id && selected.has(w.id)).length,
    [catalogRows, selected]
  );

  const wiresForCalc = useMemo(
    () =>
      selectedList
        .map((w) => {
          const unitHint =
            w.source === "platform"
              ? w.wireUnit === CIR_MILLS_UNIT_METRIC
                ? " mm"
                : " AWG"
              : "";
          return {
            size: `${w.size}${unitHint}`,
            cm: Number(w.circularMills) || 0,
          };
        })
        .filter((w) => w.cm > 0),
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

  const clearCatalogCurrentUnit = () => {
    const ids = new Set(platformRows.map((w) => w.id));
    if (ids.size === 0) return;
    const selectedCount = [...ids].filter((id) => selected.has(id)).length;
    if (selectedCount === 0) return;
    Alert.alert("Clear selection", `Clear selected ${unitLabel} sizes? Custom sizes stay selected.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          setSelected((prev) => {
            const next = new Set(prev);
            ids.forEach((id) => next.delete(id));
            return next;
          });
        },
      },
    ]);
  };

  const clearBestMatchFields = () => {
    Alert.alert("Clear fields", "Clear all job input fields?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          setOriginalWiredInHand("");
          setOriginalWireSize("");
          setOriginalCM("");
          setTargetedCM("");
          setMinWires("3");
          setMaxWires("10");
          setOriginalWireQtys({});
          setResults([]);
          setResultContext(null);
          setResultsPage(1);
        },
      },
    ]);
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
    if (allSelectableRows.some((w) => String(w.size).trim().toLowerCase() === sizeKey && w.custom)) {
      Alert.alert("Already listed", "That custom size is already in the catalog.");
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
    Alert.alert("Remove wire size", `Remove ${w.size} from your catalog?`, [
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

  const applyOriginalWireSelection = (selections) => {
    const { display, totalQty, totalCm } = formatOriginalWireSelection(selections);
    if (!selections.length) {
      setOriginalWireQtys({});
      setOriginalWireSize("");
      setOriginalWiredInHand("");
      setOriginalCM("");
      setTargetedCM("");
      setOriginalPickerOpen(false);
      return;
    }
    const nextQtys = {};
    for (const s of selections) {
      if (s.id) nextQtys[s.id] = String(s.qty);
    }
    setOriginalWireQtys(nextQtys);
    setOriginalWireSize(display);
    setOriginalWiredInHand(String(totalQty));
    setOriginalCM(String(totalCm));
    setTargetedCM(String(totalCm));
    setOriginalPickerOpen(false);
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
      Alert.alert("Desired wires", "Enter valid desired min and max wire counts.");
      return;
    }
    if (minW < 1 || maxW < minW) {
      Alert.alert("Desired wires", "Desired min wires must be ≥ 1 and desired max wires must be ≥ min.");
      return;
    }
    if (maxW > MAX_WIRES_CAP) {
      Alert.alert("Desired max wires", `Desired max wires is capped at ${MAX_WIRES_CAP} for performance.`);
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
      originalWiredInHand: emptyDash(originalWiredInHand),
      originalWireSize: emptyDash(originalWireSize),
      originalCMDisplay: Number.isFinite(ocm) && ocm > 0 ? String(ocm) : "-",
      targetedCM: String(t),
      minWires: String(minW),
      maxWires: String(maxW),
      selectedCatalogSummary: selectedList
        .map((w) => {
          const unitHint =
            w.source === "platform"
              ? w.wireUnit === CIR_MILLS_UNIT_METRIC
                ? " mm"
                : " AWG"
              : "";
          return `${w.size}${unitHint} (${w.circularMills} CM)`;
        })
        .join("; "),
    };
    setResultContext(ctx);
    setResultsPage(1);

    const out = calculateCMBestMatch(wiresForCalc, t, minW, maxW);
    setResults(out);
    setResultsTitle("CM Best Match");
    if (out.length === 0) {
      setResultsOpen(false);
      Alert.alert("No matches", "No combinations within ±5% of target with the current limits.");
    } else {
      setResultsOpen(true);
    }
  };

  const loadSaved = useCallback(async () => {
    if (!token) return;
    setSavedLoading(true);
    try {
      const data = await appFetch("/api/mobile-app/saved", { token });
      const items = Array.isArray(data.items) ? data.items : [];
      setSavedItems(items.filter((item) => item.calculatorType === "cm_best_match"));
    } catch {
      setSavedItems([]);
    } finally {
      setSavedLoading(false);
    }
  }, [token]);

  const openSavedList = () => {
    setSavedOpen(true);
    loadSaved();
  };

  const deleteSaved = (item) => {
    Alert.alert("Delete saved calculation", `Remove "${item.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await appFetch(`/api/mobile-app/saved/${item.id}`, { token, method: "DELETE" });
            setSavedItems((prev) => prev.filter((x) => x.id !== item.id));
          } catch (e) {
            Alert.alert("Could not delete", e.message || "Try again.");
          }
        },
      },
    ]);
  };

  const shareArgs = () => ({ title: resultsTitle, results, resultContext });

  const onPrintResults = async () => {
    if (sharing) return;
    setSharing("print");
    try {
      await printCmResults(shareArgs());
    } catch (e) {
      Alert.alert("Could not print", e.message || "Try again.");
    } finally {
      setSharing("");
    }
  };

  const onEmailResults = async () => {
    if (sharing) return;
    setSharing("email");
    try {
      await emailCmResults(shareArgs());
    } catch (e) {
      Alert.alert("Could not email", e.message || "Try again.");
    } finally {
      setSharing("");
    }
  };

  const openSavedItem = (item) => {
    const payload = item?.results && typeof item.results === "object" ? item.results : {};
    const rows = Array.isArray(payload.rows) ? payload.rows : Array.isArray(payload.top) ? payload.top : [];
    const ctx = payload.context || null;
    if (ctx) {
      setOriginalWiredInHand(ctx.originalWiredInHand === "-" ? "" : ctx.originalWiredInHand || "");
      setOriginalWireSize(ctx.originalWireSize === "-" ? "" : ctx.originalWireSize || "");
      setOriginalCM(ctx.originalCMDisplay === "-" ? "" : ctx.originalCMDisplay || "");
      setTargetedCM(ctx.targetedCM || "");
      setMinWires(ctx.minWires || "3");
      setMaxWires(ctx.maxWires || "10");
    }
    setResults(rows);
    setResultContext(ctx);
    setResultsTitle(item.title || "Saved result");
    setResultsPage(1);
    setSavedOpen(false);
    setResultsOpen(true);
  };

  const totalPages = Math.max(1, Math.ceil(results.length / RESULTS_PAGE_SIZE) || 1);
  const safePage = Math.min(Math.max(1, resultsPage), totalPages);
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * RESULTS_PAGE_SIZE;
    return results.slice(start, start + RESULTS_PAGE_SIZE);
  }, [results, safePage]);
  const startItem = results.length === 0 ? 0 : (safePage - 1) * RESULTS_PAGE_SIZE + 1;
  const endItem = Math.min(safePage * RESULTS_PAGE_SIZE, results.length);

  const pickerPlatformRows = useMemo(() => buildPlatformRows(pickerUnit), [pickerUnit]);
  const pickerRows = useMemo(() => [...pickerPlatformRows, ...customRows], [pickerPlatformRows, customRows]);
  const pickerUnitLabel = pickerUnit === CIR_MILLS_UNIT_METRIC ? "Metric" : "AWG";

  const setPickerQty = (id, value) => {
    setOriginalWireQtys((prev) => {
      const next = { ...prev };
      const cleaned = String(value || "").replace(/[^0-9.]/g, "");
      if (!cleaned) delete next[id];
      else next[id] = cleaned;
      return next;
    });
  };

  const clearPickerCurrentUnit = () => {
    const ids = new Set(pickerPlatformRows.map((w) => w.id));
    setOriginalWireQtys((prev) => {
      const next = { ...prev };
      ids.forEach((id) => delete next[id]);
      return next;
    });
  };

  const applyPicker = () => {
    const selections = allSelectableRows
      .map((w) => {
        const qty = originalWireQtys[w.id];
        if (!qty) return null;
        return { id: w.id, size: w.size, qty, circularMills: w.circularMills };
      })
      .filter(Boolean);
    applyOriginalWireSelection(selections);
  };

  const modalPadTop = Math.max(insets.top, 12) + (Platform.OS === "ios" ? 0 : 8);

  const renderCatalogWire = ({ item: w }) => (
    <Pressable style={styles.wireRow} onPress={() => w.id && toggleId(w.id)}>
      <Ionicons
        name={w.id && selected.has(w.id) ? "checkbox" : "square-outline"}
        size={28}
        color={colors.primary}
      />
      <View style={styles.wireMain}>
        <Text style={styles.wireSize}>{w.size}</Text>
        {w.custom ? <Text style={styles.customBadge}>Custom</Text> : null}
      </View>
      <Text style={styles.wireCm}>{fmt(Number(w.circularMills) || 0, 0)} CM</Text>
      {w.custom ? (
        <Pressable onPress={() => removeWire(w)} hitSlop={8} style={styles.trash}>
          <Ionicons name="trash-outline" size={22} color={colors.danger} />
        </Pressable>
      ) : (
        <View style={styles.trashPlaceholder} />
      )}
    </Pressable>
  );

  return (
    <View style={styles.root}>
      <View style={styles.pageTabs}>
        <Pressable
          style={[styles.pageTab, pageTab === "catalog" && styles.pageTabActive]}
          onPress={() => setPageTab("catalog")}
        >
          <Text style={[styles.pageTabText, pageTab === "catalog" && styles.pageTabTextActive]}>Wire Catalog</Text>
        </Pressable>
        <Pressable
          style={[styles.pageTab, pageTab === "original" && styles.pageTabActive]}
          onPress={() => setPageTab("original")}
        >
          <Text style={[styles.pageTabText, pageTab === "original" && styles.pageTabTextActive]}>Original Wires</Text>
        </Pressable>
      </View>

      {pageTab === "catalog" ? (
        <View style={styles.tabBody}>
          <View style={styles.catalogToolbar}>
            <SegmentedTwo
              a={{ value: CIR_MILLS_UNIT_AWG, label: "AWG" }}
              b={{ value: CIR_MILLS_UNIT_METRIC, label: "Metric" }}
              value={catalogUnit}
              onChange={setCatalogUnit}
            />
            <View style={styles.toolbarRow}>
              <Text style={styles.selectedSummary} numberOfLines={2}>
                {selected.size}/{MAX_SELECT} selected · {selectedOnCurrentList} on {unitLabel}
              </Text>
              <Pressable
                style={[styles.clearBtn, selectedOnCurrentList === 0 && styles.btnDisabled]}
                disabled={platformRows.every((w) => !selected.has(w.id))}
                onPress={clearCatalogCurrentUnit}
              >
                <Text style={styles.clearBtnText}>Clear selection</Text>
              </Pressable>
            </View>
            <Text style={styles.tableCaption}>{sizeColumnLabel} · Cir. Mills</Text>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
          ) : (
            <FlatList
              style={styles.flex}
              data={catalogRows}
              keyExtractor={(item) => item.id}
              renderItem={renderCatalogWire}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
              ListHeaderComponent={
                <View style={styles.catalogHeaderRow}>
                  <Text style={[styles.thCell, styles.thCheck]} />
                  <Text style={[styles.thCell, styles.thSize]}>Size</Text>
                  <Text style={[styles.thCell, styles.thCm]}>Cir. Mills</Text>
                  <Text style={[styles.thCell, styles.thAction]} />
                </View>
              }
              ListFooterComponent={
                <View style={styles.addCustomBox}>
                  <Text style={styles.subHead}>Add custom size</Text>
                  <View style={styles.row}>
                    <LabeledInput
                      compact
                      style={styles.col}
                      label="New size"
                      value={newSize}
                      onChangeText={setNewSize}
                      placeholder="e.g. 18.5"
                    />
                    <LabeledInput
                      compact
                      style={styles.col}
                      label="Circular mils"
                      value={newCm}
                      onChangeText={setNewCm}
                      placeholder="CM"
                      keyboardType="numeric"
                    />
                  </View>
                  <Pressable
                    style={[styles.primaryBtn, savingWire && styles.btnDisabled]}
                    disabled={savingWire}
                    onPress={addWire}
                  >
                    <Text style={styles.primaryBtnText}>{savingWire ? "Adding…" : "Add to catalog"}</Text>
                  </Pressable>
                  <Pressable style={styles.gotoFormBtn} onPress={() => setPageTab("original")}>
                    <Text style={styles.gotoFormBtnText}>Continue to Original Wires</Text>
                    <Ionicons name="arrow-forward" size={18} color={colors.primary} />
                  </Pressable>
                </View>
              }
            />
          )}
        </View>
      ) : (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.formContent, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.selectionBanner}>
            <Text style={styles.selectionBannerTitle}>Catalog for search</Text>
            <Text style={styles.selectionBannerBody} numberOfLines={3}>
              {selectedList.length === 0
                ? "No sizes selected. Open Wire Catalog and choose up to 10 sizes."
                : selectedList
                    .map((w) => {
                      const hint =
                        w.source === "platform"
                          ? w.wireUnit === CIR_MILLS_UNIT_METRIC
                            ? " mm"
                            : " AWG"
                          : "";
                      return `${w.size}${hint}`;
                    })
                    .join(", ")}
            </Text>
            <Pressable onPress={() => setPageTab("catalog")}>
              <Text style={styles.linkText}>Edit Wire Catalog</Text>
            </Pressable>
          </View>

          <CalcPanel title="CM Best Match" style={styles.compactPanel}>
            <View style={styles.rowActions}>
              <Pressable style={styles.outlineBtn} onPress={clearBestMatchFields}>
                <Text style={styles.outlineBtnText}>Clear fields</Text>
              </Pressable>
              {results.length > 0 ? (
                <Pressable
                  style={styles.outlineBtn}
                  onPress={() => {
                    setResultsPage(1);
                    setResultsOpen(true);
                  }}
                >
                  <Text style={styles.outlineBtnText}>View results ({results.length})</Text>
                </Pressable>
              ) : null}
            </View>

            <LabeledInput
              compact
              label="Original Wires in Hand"
              value={originalWiredInHand}
              onChangeText={setOriginalWiredInHand}
              placeholder="10"
              keyboardType="numeric"
            />

            <Text style={styles.fieldLabel}>Original Wire Size</Text>
            <View style={styles.origSizeRow}>
              <TextInput
                style={[styles.textInput, styles.flex]}
                value={originalWireSize}
                onChangeText={setOriginalWireSize}
                placeholder="e.g. 12.5 #8, 13.5 #6"
                placeholderTextColor={colors.secondary}
              />
              <Pressable style={styles.plusBtn} onPress={() => setOriginalPickerOpen(true)}>
                <Ionicons name="add" size={22} color="#fff" />
              </Pressable>
            </View>

            <LabeledInput
              compact
              label="Original CM"
              value={originalCM}
              onChangeText={setOriginalCM}
              keyboardType="numeric"
            />
            <LabeledInput
              compact
              label="Targeted CM"
              value={targetedCM}
              onChangeText={setTargetedCM}
              placeholder="12360"
              keyboardType="numeric"
            />
            <View style={styles.row}>
              <LabeledInput
                compact
                style={styles.col}
                label="Desired Min Wires"
                value={minWires}
                onChangeText={setMinWires}
                keyboardType="numeric"
              />
              <LabeledInput
                compact
                style={styles.col}
                label="Desired Max Wires"
                value={maxWires}
                onChangeText={setMaxWires}
                keyboardType="numeric"
              />
            </View>

            <Note>
              Targeted CM is the search goal (±5%). Desired Min/Max limit total conductors. Up to 3 wire sizes may be
              used in parallel. Use + to fill original wires from the catalog.
            </Note>

            <Pressable style={styles.primaryBtn} onPress={runCalculate}>
              <Text style={styles.primaryBtnText}>Calculate Best Match</Text>
            </Pressable>

            <View style={styles.rowActions}>
              <SaveCalculationButton
                calculatorType="cm_best_match"
                getPayload={() => ({
                  inputs: {
                    originalWiredInHand,
                    originalWireSize,
                    originalCM,
                    targetedCM,
                    minWires,
                    maxWires,
                    selectedIds: [...selected],
                  },
                  rows: results,
                  context: resultContext,
                })}
                disabled={results.length === 0}
              />
              <Pressable style={styles.outlineBtn} onPress={openSavedList}>
                <Text style={styles.outlineBtnText}>View saved</Text>
              </Pressable>
            </View>
          </CalcPanel>
        </ScrollView>
      )}

      {/* Original wires picker */}
      <Modal visible={originalPickerOpen} animationType="slide" onRequestClose={() => setOriginalPickerOpen(false)}>
        <View style={[styles.modalRoot, { paddingTop: modalPadTop, paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select original wires</Text>
            <Pressable onPress={() => setOriginalPickerOpen(false)} hitSlop={10}>
              <Ionicons name="close" size={28} color={colors.title} />
            </Pressable>
          </View>
          <SegmentedTwo
            a={{ value: CIR_MILLS_UNIT_AWG, label: "AWG" }}
            b={{ value: CIR_MILLS_UNIT_METRIC, label: "Metric" }}
            value={pickerUnit}
            onChange={setPickerUnit}
          />
          <View style={styles.rowActions}>
            <Pressable style={styles.outlineBtn} onPress={clearPickerCurrentUnit}>
              <Text style={styles.outlineBtnText}>Clear {pickerUnitLabel}</Text>
            </Pressable>
          </View>
          <FlatList
            data={pickerRows}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item: w }) => (
              <View style={styles.pickerRow}>
                <View style={styles.wireMain}>
                  <Text style={styles.wireSize}>{w.size}</Text>
                  {w.custom ? <Text style={styles.customBadge}>Custom</Text> : null}
                  <Text style={styles.pickerCm}>{fmt(Number(w.circularMills) || 0, 0)} CM</Text>
                </View>
                <TextInput
                  style={styles.qtyInput}
                  value={originalWireQtys[w.id] || ""}
                  onChangeText={(v) => setPickerQty(w.id, v)}
                  keyboardType="numeric"
                  placeholder="Qty"
                  placeholderTextColor={colors.secondary}
                />
              </View>
            )}
          />
          <Pressable style={styles.primaryBtn} onPress={applyPicker}>
            <Text style={styles.primaryBtnText}>Apply selection</Text>
          </Pressable>
        </View>
      </Modal>

      {/* Results modal */}
      <Modal visible={resultsOpen} animationType="slide" onRequestClose={() => setResultsOpen(false)}>
        <View style={[styles.modalRoot, { paddingTop: modalPadTop, paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{resultsTitle}</Text>
            <Pressable onPress={() => setResultsOpen(false)} hitSlop={10}>
              <Ionicons name="close" size={28} color={colors.title} />
            </Pressable>
          </View>
          <Text style={styles.modalMeta}>
            Generated {new Date().toLocaleString()} · {results.length} match{results.length === 1 ? "" : "es"} ·
            Print uses landscape
          </Text>
          <View style={styles.rowActions}>
            <Pressable
              style={[styles.outlineBtn, sharing === "print" && styles.btnDisabled]}
              disabled={!!sharing}
              onPress={onPrintResults}
            >
              <Text style={styles.outlineBtnText}>{sharing === "print" ? "Printing…" : "Print"}</Text>
            </Pressable>
            <Pressable
              style={[styles.outlineBtn, sharing === "email" && styles.btnDisabled]}
              disabled={!!sharing}
              onPress={onEmailResults}
            >
              <Text style={styles.outlineBtnText}>{sharing === "email" ? "Emailing…" : "Email PDF"}</Text>
            </Pressable>
          </View>

          {resultContext ? (
            <View style={styles.ctxBox}>
              <Text style={styles.ctxLine}>Original Wires in Hand: {resultContext.originalWiredInHand}</Text>
              <Text style={styles.ctxLine}>Original Wire Size: {resultContext.originalWireSize}</Text>
              <Text style={styles.ctxLine}>Original CM: {resultContext.originalCMDisplay}</Text>
              <Text style={styles.ctxLine}>Targeted CM: {resultContext.targetedCM}</Text>
              <Text style={styles.ctxLine}>Desired Min Wires: {resultContext.minWires}</Text>
              <Text style={styles.ctxLine}>Desired Max Wires: {resultContext.maxWires}</Text>
              {resultContext.selectedCatalogSummary ? (
                <Text style={styles.ctxLine}>Catalog sizes used in search: {resultContext.selectedCatalogSummary}</Text>
              ) : null}
            </View>
          ) : null}

          <Text style={styles.legend}>Green ≈ within 2% · Yellow ≈ within 5% · Unused size slots show 0</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator>
            <View>
              <View style={styles.tableHead}>
                {[
                  "Wire Size",
                  "# Wires",
                  "Wire Size 2",
                  "# Wires 2",
                  "Wire Size 3",
                  "# Wires 3",
                  "Total CM",
                  "Targeted CM",
                  "Wires In Hand",
                  "% Difference",
                  "CM Difference",
                  "No of Wires",
                ].map((h) => (
                  <Text key={h} style={styles.th}>
                    {h}
                  </Text>
                ))}
              </View>
              <FlatList
                data={pageRows}
                keyExtractor={(_, i) => String(i)}
                style={{ maxHeight: 420 }}
                renderItem={({ item: row }) => {
                  const pct = Number(row.percentDifference) || 0;
                  const pctLabel = `${pct > 0 ? "+" : ""}${pct}%`;
                  const cells = [
                    row.wires1 > 0 ? row.wireSize1 : "0",
                    row.wires1 > 0 ? row.wires1 : 0,
                    row.wires2 > 0 ? row.wireSize2 : "0",
                    row.wires2 > 0 ? row.wires2 : 0,
                    row.wires3 > 0 ? row.wireSize3 : "0",
                    row.wires3 > 0 ? row.wires3 : 0,
                    fmt(row.totalCM, 0),
                    fmt(row.targetedCM, 0),
                    row.wiresInHand,
                    pctLabel,
                    fmt(row.cmDifference, 0),
                    row.noOfWires,
                  ];
                  return (
                    <View style={[styles.tableRow, { backgroundColor: resultRowBg(pct) }]}>
                      {cells.map((c, idx) => (
                        <Text key={idx} style={styles.td}>
                          {c}
                        </Text>
                      ))}
                    </View>
                  );
                }}
              />
            </View>
          </ScrollView>

          <Text style={styles.modalMeta}>
            Showing {startItem}-{endItem} of {results.length} · {RESULTS_PAGE_SIZE} per page
          </Text>
          <View style={styles.rowActions}>
            <Pressable
              style={[styles.outlineBtn, safePage <= 1 && styles.btnDisabled]}
              disabled={safePage <= 1}
              onPress={() => setResultsPage((p) => Math.max(1, p - 1))}
            >
              <Text style={styles.outlineBtnText}>Previous</Text>
            </Pressable>
            <Pressable
              style={[styles.outlineBtn, safePage >= totalPages && styles.btnDisabled]}
              disabled={safePage >= totalPages}
              onPress={() => setResultsPage((p) => Math.min(totalPages, p + 1))}
            >
              <Text style={styles.outlineBtnText}>Next</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Saved list */}
      <Modal visible={savedOpen} animationType="slide" onRequestClose={() => setSavedOpen(false)}>
        <View style={[styles.modalRoot, { paddingTop: modalPadTop, paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Saved CM Best Match</Text>
            <Pressable onPress={() => setSavedOpen(false)} hitSlop={10}>
              <Ionicons name="close" size={28} color={colors.title} />
            </Pressable>
          </View>
          {savedLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <FlatList
              data={savedItems}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={<Text style={styles.modalMeta}>No saved calculations yet.</Text>}
              renderItem={({ item }) => (
                <Pressable style={styles.savedRow} onPress={() => openSavedItem(item)}>
                  <View style={styles.flex}>
                    <Text style={styles.wireSize}>{item.title}</Text>
                    <Text style={styles.modalMeta}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
                    </Text>
                  </View>
                  <Pressable onPress={() => deleteSaved(item)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={22} color={colors.danger} />
                  </Pressable>
                </Pressable>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const COL_W = 88;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  pageTabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  pageTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  pageTabActive: {
    borderBottomColor: colors.primary,
  },
  pageTabText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.secondary,
  },
  pageTabTextActive: {
    color: colors.primary,
  },
  tabBody: { flex: 1 },
  catalogToolbar: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  toolbarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  clearBtn: {
    backgroundColor: colors.formBg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearBtnText: { color: colors.danger, fontWeight: "800", fontSize: 12 },
  tableCaption: { fontSize: 12, color: colors.secondary, fontWeight: "600" },
  catalogHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: colors.formBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  thCell: { fontSize: 11, fontWeight: "800", color: colors.secondary, textTransform: "uppercase" },
  thCheck: { width: 36 },
  thSize: { flex: 1 },
  thCm: { width: 88, textAlign: "right" },
  thAction: { width: 36 },
  addCustomBox: {
    margin: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    gap: spacing.sm,
  },
  gotoFormBtn: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  gotoFormBtnText: { color: colors.primary, fontWeight: "800", fontSize: 14 },
  formContent: { padding: spacing.md, gap: spacing.md },
  selectionBanner: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.md,
    gap: 6,
  },
  selectionBannerTitle: { fontSize: 12, fontWeight: "800", color: colors.secondary, textTransform: "uppercase" },
  selectionBannerBody: { fontSize: 13, color: colors.title, lineHeight: 18 },
  linkText: { color: colors.primary, fontWeight: "800", fontSize: 13, marginTop: 4 },
  compactPanel: { gap: spacing.sm },
  row: { flexDirection: "row", gap: spacing.sm },
  col: { flex: 1, minWidth: 0 },
  rowActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignItems: "center" },
  outlineBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  outlineBtnText: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  btnDisabled: { opacity: 0.45 },
  selectedSummary: { flex: 1, fontSize: 12, fontWeight: "700", color: colors.title },
  subHead: { marginTop: 4, fontSize: 12, fontWeight: "800", color: colors.title, textTransform: "uppercase" },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: colors.title, marginBottom: 4 },
  origSizeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.sm },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.formBg,
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    fontSize: 14,
    color: colors.title,
  },
  plusBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  wireRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  wireMain: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  wireSize: { fontSize: 15, fontWeight: "700", color: colors.title },
  wireCm: { fontSize: 13, color: colors.secondary, minWidth: 72, textAlign: "right" },
  customBadge: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: "hidden",
  },
  trash: { padding: 4 },
  trashPlaceholder: { width: 30 },
  modalRoot: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.md, gap: spacing.sm },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.title },
  modalMeta: { fontSize: 12, color: colors.secondary },
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pickerCm: { fontSize: 12, color: colors.secondary },
  qtyInput: {
    width: 72,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.formBg,
    paddingHorizontal: 8,
    paddingVertical: Platform.OS === "ios" ? 8 : 4,
    textAlign: "center",
    color: colors.title,
  },
  ctxBox: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 10,
    gap: 4,
  },
  ctxLine: { fontSize: 12, color: colors.title },
  legend: { fontSize: 11, color: colors.secondary },
  tableHead: { flexDirection: "row", backgroundColor: colors.primary },
  th: {
    width: COL_W,
    paddingVertical: 8,
    paddingHorizontal: 6,
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
  tableRow: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  td: {
    width: COL_W,
    paddingVertical: 8,
    paddingHorizontal: 6,
    fontSize: 11,
    color: colors.title,
  },
  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
});
