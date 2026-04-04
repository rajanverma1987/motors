import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useTechAuth } from "../TechAuthContext";
import { colors, spacing } from "../theme";
import { useCenterFieldInScroll } from "../useCenterFieldInScroll";

/**
 * Search tab: scan QR (job#), job/RFQ#, motor serial — find work orders.
 */
export default function SearchScreen({ navigation }) {
  const headerHeight = useHeaderHeight();
  const { employee, logout } = useTechAuth();
  const [rfqManual, setRfqManual] = useState("");
  const [serialManual, setSerialManual] = useState("");
  const rfqInputWrapRef = useRef(null);
  const serialInputWrapRef = useRef(null);
  const { scrollRef, onScroll, scrollFieldToCenter } = useCenterFieldInScroll(headerHeight);

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
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? headerHeight : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Search</Text>
          <Text style={styles.greet}>
            {employee?.name ? `Hi, ${employee.name}` : "Signed in"}
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          onPress={() => navigation.navigate("Scan")}
        >
          <Text style={styles.primaryBtnText}>Scan QR tag (Job#)</Text>
        </Pressable>

        <Text style={styles.sectionLabel}>Find by Job# or RFQ#</Text>
        <View collapsable={false} ref={rfqInputWrapRef}>
          <TextInput
            style={styles.input}
            value={rfqManual}
            onChangeText={setRfqManual}
            onFocus={() => scrollFieldToCenter(rfqInputWrapRef.current)}
            placeholder="e.g. RF-00042 or A00042"
            placeholderTextColor={colors.secondary}
            autoCapitalize="characters"
          />
        </View>
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
        <View collapsable={false} ref={serialInputWrapRef}>
          <TextInput
            style={styles.input}
            value={serialManual}
            onChangeText={setSerialManual}
            onFocus={() => scrollFieldToCenter(serialInputWrapRef.current)}
            placeholder="e.g. 1234-AB"
            placeholderTextColor={colors.secondary}
            autoCapitalize="characters"
          />
        </View>
        <Pressable
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          onPress={() => goSerial(serialManual)}
        >
          <Text style={styles.secondaryBtnText}>Find open work orders</Text>
        </Pressable>

        <View style={styles.footerSpacer} />

        <Pressable style={({ pressed }) => [styles.logout, pressed && styles.pressed]} onPress={logout}>
          <Text style={styles.logoutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: 220,
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
