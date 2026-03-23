import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, spacing } from "../../theme";
import { useTechAuth } from "../../TechAuthContext";

const ITEMS = [
  { key: "CmBestMatch", title: "CM Best Match", subtitle: "Circular mil winding combinations (shop catalog)", icon: "git-compare-outline" },
  { key: "PowerCurrent", title: "Power & current", subtitle: "HP ↔ kW, estimated FLA", icon: "flash-outline" },
  { key: "SpeedDrives", title: "Speed & drives", subtitle: "Synchronous RPM, belt / pulley", icon: "speedometer-outline" },
  { key: "Torque", title: "Torque", subtitle: "From power and speed", icon: "analytics-outline" },
  { key: "BenchElectrical", title: "Bench electrical", subtitle: "Ohm’s law, Δ ↔ Y resistors", icon: "hardware-chip-outline" },
];

export default function CalculatorsHomeScreen({ navigation }) {
  const { employee } = useTechAuth();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Calculators</Text>
      <Text style={styles.greet}>{employee?.name ? `Hi, ${employee.name}` : "Motor shop tools"}</Text>
      <Text style={styles.hint}>
        Same math as the CRM Calculators page. Estimates only—follow NEC / local code and nameplate data in the field.
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: "800", color: colors.title },
  greet: { fontSize: 15, color: colors.secondary, marginTop: 4 },
  hint: { fontSize: 13, color: colors.secondary, lineHeight: 20, marginTop: spacing.md, marginBottom: spacing.lg },
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
  cardPressed: { opacity: 0.85 },
  cardIcon: { marginRight: spacing.md },
  cardText: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.title },
  cardSub: { fontSize: 12, color: colors.secondary, marginTop: 2, lineHeight: 17 },
});
