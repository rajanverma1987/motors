import React, { useEffect, useRef } from "react";
import { View, Text, Image, StyleSheet, Platform, Animated, Easing, AccessibilityInfo } from "react-native";
import Constants from "expo-constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "../theme";

const APP_VERSION = Constants.expoConfig?.version || "1.0.0";

export default function AppSplashScreen() {
  const insets = useSafeAreaInsets();
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    let loop;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) {
        pulse.setValue(1);
        return;
      }
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0.35,
            duration: 900,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
    });
    return () => loop?.stop();
  }, [pulse]);

  return (
    <View style={styles.outer} accessibilityRole="progressbar" accessibilityLabel="Loading IQWireCalculator">
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <View style={[styles.center, { paddingTop: insets.top }]}>
        <View style={styles.markWrap}>
          <Image
            source={require("../../assets/icon.png")}
            style={styles.mark}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </View>
        <Text style={styles.kicker}>IQ MOTORBASE</Text>
        <Text style={styles.title}>IQWireCalculator</Text>
        <Text style={styles.sub}>Copper wire matching for the shop floor</Text>
        <View style={styles.dots} accessibilityElementsHidden>
          <Animated.View style={[styles.dot, { opacity: pulse }]} />
          <Animated.View style={[styles.dot, styles.dotMid, { opacity: pulse }]} />
          <Animated.View style={[styles.dot, { opacity: pulse }]} />
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
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

const markShadow =
  Platform.OS === "ios"
    ? { shadowColor: "hsl(26, 52%, 38%)", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 20 }
    : { elevation: 8 };

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  glowTop: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.primary,
    opacity: 0.1,
  },
  glowBottom: {
    position: "absolute",
    bottom: 80,
    left: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.accent,
    opacity: 0.07,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  markWrap: {
    width: 128,
    height: 128,
    borderRadius: 32,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
    overflow: "hidden",
    ...markShadow,
  },
  mark: { width: 96, height: 96 },
  kicker: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.8,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.title,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.4,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  sub: {
    fontSize: 15,
    color: colors.secondary,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.xl,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  dotMid: {
    backgroundColor: colors.accent,
  },
  footer: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  footerLogo: { width: 200, height: 28, marginBottom: spacing.sm, opacity: 0.9 },
  versionText: { fontSize: 12, color: colors.secondary },
});
