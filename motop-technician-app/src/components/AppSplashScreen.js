import React from "react";
import { View, Text, Image, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "../theme";

const APP_VERSION = Constants.expoConfig?.version || "1.0.0";

/**
 * Branded splash / boot screen — matches login hero styling.
 */
export default function AppSplashScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.outer}>
      <View style={[styles.hero, { paddingTop: insets.top + spacing.xl * 2 }]}>
        <View style={styles.heroGlow} />
        <View style={styles.iconBadge}>
          <Ionicons name="construct-outline" size={36} color="#fff" />
        </View>
        <Text style={styles.heroTitle}>Motop Technician</Text>
        <Text style={styles.heroSub}>Shop floor tools for IQ Motorbase CRM</Text>
        <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.footerRule} />
        <Image
          source={require("../../assets/iqmotorbase-logo.png")}
          style={styles.footerLogo}
          resizeMode="contain"
          accessibilityLabel="IQ Motorbase"
        />
        <Text style={styles.versionText}>Version {APP_VERSION}</Text>
      </View>
    </View>
  );
}

const badgeShadow =
  Platform.OS === "ios"
    ? {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 8,
      }
    : { elevation: 4 };

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  hero: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    backgroundColor: "hsl(28, 32%, 93%)",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    top: -50,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.primary,
    opacity: 0.12,
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    ...badgeShadow,
  },
  heroTitle: {
    color: colors.title,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  heroSub: {
    fontSize: 15,
    color: colors.secondary,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
    marginBottom: spacing.xl,
  },
  spinner: {
    marginTop: spacing.md,
  },
  footer: {
    alignItems: "center",
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  footerRule: {
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },
  footerLogo: {
    width: 220,
    height: 30,
    marginBottom: spacing.sm,
    opacity: 0.9,
  },
  versionText: {
    fontSize: 12,
    color: colors.secondary,
    letterSpacing: 0.2,
  },
});
