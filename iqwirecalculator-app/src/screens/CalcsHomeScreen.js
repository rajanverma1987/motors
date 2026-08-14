import React, { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, RefreshControl, Alert } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import { colors, spacing } from "../theme";
import { useMobileAuth } from "../AuthContext";
import { appFetch } from "../api";

const ALL_ITEMS = [
  { key: "CmBestMatch", title: "CM Best Match", subtitle: "Circular mil winding combinations", icon: "git-compare-outline", calculatorType: "cm_best_match" },
  { key: "PowerCurrent", title: "Power & current", subtitle: "HP ↔ kW, estimated FLA", icon: "flash-outline", calculatorType: "power" },
  { key: "SpeedDrives", title: "Speed & drives", subtitle: "Synchronous RPM, belt / pulley", icon: "speedometer-outline", calculatorType: "speed" },
  { key: "Torque", title: "Torque", subtitle: "From power and speed", icon: "analytics-outline", calculatorType: "torque" },
  { key: "BenchElectrical", title: "Bench electrical", subtitle: "Ohm’s law, Δ ↔ Y resistors", icon: "hardware-chip-outline", calculatorType: "electrical" },
];

/** Re-enable calculators here as they ship. */
const ENABLED_KEYS = ["CmBestMatch"];
const ITEMS = ALL_ITEMS.filter((item) => ENABLED_KEYS.includes(item.key));
const ENABLED_TYPES = new Set(ITEMS.map((item) => item.calculatorType));

function trialLabel(account) {
  if (!account?.trialEndsAt || account.accessMode !== "trial") return "";
  const ms = new Date(account.trialEndsAt).getTime() - Date.now();
  if (ms <= 0) return "";
  const hours = Math.ceil(ms / 3600000);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} left in your free trial`;
  const days = Math.ceil(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} left in your free trial`;
}

export default function CalcsHomeScreen({ navigation }) {
  const { account, token, refreshAccount } = useMobileAuth();
  const [saved, setSaved] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const data = await appFetch("/api/mobile-app/saved", { token });
      const items = Array.isArray(data.items) ? data.items : [];
      setSaved(items.filter((item) => ENABLED_TYPES.has(item.calculatorType)));
    } catch {
      setSaved([]);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
      refreshAccount().catch(() => {});
    }, [load, refreshAccount])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    await refreshAccount().catch(() => {});
    setRefreshing(false);
  };

  const deleteSaved = (item) => {
    Alert.alert("Delete saved calculation", `Remove “${item.title}”?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await appFetch(`/api/mobile-app/saved/${item.id}`, { token, method: "DELETE" });
            setSaved((prev) => prev.filter((x) => x.id !== item.id));
          } catch (e) {
            Alert.alert("Could not delete", e.message || "Try again.");
          }
        },
      },
    ]);
  };

  const trial = trialLabel(account);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Calculators</Text>
      <Text style={styles.greet}>{account?.name ? `Hi, ${account.name}` : "Motor shop tools"}</Text>
      {trial ? (
        <View style={styles.trialBanner}>
          <Ionicons name="time-outline" size={18} color={colors.primary} />
          <Text style={styles.trialText}>{trial}</Text>
        </View>
      ) : null}
      <Text style={styles.hint}>
        Same math as IQMotorBase. Estimates only—follow NEC / local code and nameplate data in the field.
      </Text>

      {ITEMS.map((item) => (
        <Pressable
          key={item.key}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => navigation.navigate(item.key)}
        >
          <Ionicons name={item.icon} size={28} color={colors.primary} style={styles.cardIcon} />
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSub}>{item.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.secondary} />
        </Pressable>
      ))}

      <Text style={styles.section}>Saved calculations</Text>
      {saved.length === 0 ? (
        <Text style={styles.empty}>Nothing saved yet. Open a calculator and tap Save this calculation.</Text>
      ) : (
        saved.map((item) => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [styles.savedRow, pressed && styles.cardPressed]}
            onPress={() => navigation.navigate("SavedDetail", { item })}
          >
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardSub}>
                {item.calculatorType} · {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
              </Text>
            </View>
            <Pressable onPress={() => deleteSaved(item)} hitSlop={10} style={styles.trash}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </Pressable>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "800", color: colors.title },
  greet: { fontSize: 15, color: colors.secondary, marginTop: 4 },
  hint: { fontSize: 13, color: colors.secondary, lineHeight: 20, marginTop: spacing.md, marginBottom: spacing.lg },
  trialBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 10,
    backgroundColor: "hsl(26, 40%, 94%)",
    borderWidth: 1,
    borderColor: colors.border,
  },
  trialText: { flex: 1, color: colors.primary, fontWeight: "700", fontSize: 13 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardPressed: { opacity: 0.85 },
  cardIcon: { marginRight: spacing.md },
  cardText: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.title },
  cardSub: { fontSize: 12, color: colors.secondary, marginTop: 2, lineHeight: 17 },
  section: { fontSize: 16, fontWeight: "800", color: colors.title, marginTop: spacing.lg, marginBottom: spacing.md },
  empty: { fontSize: 13, color: colors.secondary, lineHeight: 20 },
  trash: { padding: 6 },
});
