import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView } from "react-native";
import { useTechAuth } from "../TechAuthContext";
import { useBookmarks } from "../BookmarksContext";
import { colors, spacing } from "../theme";

export default function HomeScreen({ navigation }) {
  const { employee, logout } = useTechAuth();
  const { bookmarks, removeBookmark, bookmarksReady } = useBookmarks();
  const [rfqManual, setRfqManual] = useState("");
  const [serialManual, setSerialManual] = useState("");

  const goRfq = (rfq) => {
    const code = String(rfq || "").trim();
    if (!code) {
      Alert.alert("RFQ required", "Enter an RFQ number or scan a tag.");
      return;
    }
    navigation.navigate("RfqWorkOrders", { rfq: code });
  };

  const goSerial = (serial) => {
    const code = String(serial || "").trim();
    if (!code) {
      Alert.alert("Serial required", "Enter the motor serial number.");
      return;
    }
    navigation.navigate("RfqWorkOrders", { serial: code });
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Shop floor</Text>
        <Text style={styles.greet}>
          {employee?.name ? `Hi, ${employee.name}` : "Signed in"}
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
        onPress={() => navigation.navigate("Scan")}
      >
        <Text style={styles.primaryBtnText}>Scan QR tag (RFQ)</Text>
      </Pressable>

      <Text style={styles.sectionLabel}>Find by RFQ#</Text>
      <TextInput
        style={styles.input}
        value={rfqManual}
        onChangeText={setRfqManual}
        placeholder="e.g. A00042"
        placeholderTextColor={colors.secondary}
        autoCapitalize="characters"
      />
      <Pressable
        style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
        onPress={() => goRfq(rfqManual)}
      >
        <Text style={styles.secondaryBtnText}>Find work orders</Text>
      </Pressable>

      <Text style={[styles.sectionLabel, styles.sectionSpacer]}>Find by motor serial</Text>
      <Text style={styles.sectionHint}>
        Lists open work orders for motors with this serial (S/N) in your shop.
      </Text>
      <TextInput
        style={styles.input}
        value={serialManual}
        onChangeText={setSerialManual}
        placeholder="e.g. 1234-AB"
        placeholderTextColor={colors.secondary}
        autoCapitalize="characters"
      />
      <Pressable
        style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
        onPress={() => goSerial(serialManual)}
      >
        <Text style={styles.secondaryBtnText}>Find open work orders</Text>
      </Pressable>

      {bookmarksReady && bookmarks.length > 0 ? (
        <View style={styles.bookmarkBlock}>
          <Text style={styles.sectionLabel}>Bookmarked work orders</Text>
          {bookmarks.map((item) => (
            <View key={item.id} style={styles.bmRow}>
              <Pressable
                style={styles.bmMain}
                onPress={() => navigation.navigate("WorkOrderDetail", { id: item.id })}
              >
                <Text style={styles.bmWo}>{item.workOrderNumber || item.id}</Text>
                <Text style={styles.bmSub} numberOfLines={1}>
                  {item.companyName || "—"}
                  {item.quoteRfqNumber ? ` · RFQ ${item.quoteRfqNumber}` : ""}
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.bmRemove, pressed && styles.pressed]}
                onPress={() => removeBookmark(item.id)}
                hitSlop={8}
              >
                <Text style={styles.bmRemoveText}>Remove</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.footerSpacer} />

      <Pressable style={({ pressed }) => [styles.logout, pressed && styles.pressed]} onPress={logout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: 40,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.title,
  },
  greet: {
    marginTop: spacing.sm,
    fontSize: 15,
    color: colors.secondary,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  sectionSpacer: {
    marginTop: spacing.xl,
  },
  sectionHint: {
    fontSize: 13,
    color: colors.secondary,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  input: {
    backgroundColor: colors.formBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 17,
    color: colors.text,
    marginBottom: spacing.md,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  secondaryBtnText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.88,
  },
  bookmarkBlock: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bmRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    overflow: "hidden",
  },
  bmMain: {
    flex: 1,
    padding: spacing.md,
  },
  bmWo: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.title,
  },
  bmSub: {
    marginTop: 4,
    fontSize: 13,
    color: colors.secondary,
  },
  bmRemove: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  bmRemoveText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "600",
  },
  footerSpacer: {
    height: spacing.xl,
  },
  logout: {
    paddingVertical: 12,
    alignItems: "center",
  },
  logoutText: {
    color: colors.secondary,
    fontSize: 15,
  },
});
