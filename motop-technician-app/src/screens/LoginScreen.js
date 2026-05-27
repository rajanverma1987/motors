import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTechAuth } from "../TechAuthContext";
import { colors, spacing } from "../theme";
import { useCenterFieldInScroll } from "../useCenterFieldInScroll";

const APP_VERSION = Constants.expoConfig?.version || "1.0.0";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useTechAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const emailWrapRef = useRef(null);
  const passwordWrapRef = useRef(null);
  const { scrollRef, onScroll, scrollFieldToCenter } = useCenterFieldInScroll(insets.top);

  const onSubmit = async () => {
    setError("");
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(e.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.outer}>
      <View style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.heroGlow} />
        <View style={styles.iconBadge}>
          <Ionicons name="construct-outline" size={28} color="#fff" />
        </View>
        <Text style={styles.heroTitle}>Motop Technician</Text>
        <Text style={styles.heroSub}>Shop floor tools for IQ Motorbase CRM</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          bounces={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.scrollInner,
            { paddingBottom: insets.bottom + spacing.lg },
          ]}
        >
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign in</Text>
            <Text style={styles.cardSub}>
              Use the employee email and password your shop admin set in the CRM.
            </Text>

            <Text style={styles.label}>Email</Text>
            <View collapsable={false} ref={emailWrapRef} style={styles.inputRow}>
              <Ionicons name="mail-outline" size={20} color={colors.secondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                onFocus={() => scrollFieldToCenter(emailWrapRef.current)}
                placeholder="you@company.com"
                placeholderTextColor={colors.secondary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="username"
              />
            </View>

            <Text style={styles.label}>Password</Text>
            <View collapsable={false} ref={passwordWrapRef} style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.secondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                onFocus={() => scrollFieldToCenter(passwordWrapRef.current)}
                placeholder="Your CRM password"
                placeholderTextColor={colors.secondary}
                secureTextEntry
                textContentType="password"
              />
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                busy && styles.buttonDisabled,
              ]}
              onPress={onSubmit}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Sign in</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </Pressable>
          </View>

          <View style={styles.footer}>
            <View style={styles.footerRule} />
            <Image
              source={require("../../assets/iqmotorbase-logo.png")}
              style={styles.footerLogo}
              resizeMode="contain"
              accessibilityLabel="IQ Motorbase"
            />
            <Text style={styles.versionText}>Version {APP_VERSION}</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const cardShadow =
  Platform.OS === "ios"
    ? {
        shadowColor: "hsl(22, 40%, 9%)",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
      }
    : { elevation: 4 };

const buttonShadow =
  Platform.OS === "ios"
    ? {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 8,
      }
    : { elevation: 3 };

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  hero: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl + 8,
    backgroundColor: "hsl(28, 32%, 93%)",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    top: -40,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "hsl(26, 52%, 38%)",
    opacity: 0.12,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    ...buttonShadow,
  },
  heroTitle: {
    color: colors.title,
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 14,
    color: colors.secondary,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
  scrollInner: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    marginTop: spacing.sm,
    ...cardShadow,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.title,
    marginBottom: spacing.sm,
  },
  cardSub: {
    fontSize: 14,
    color: colors.secondary,
    lineHeight: 20,
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.formBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "hsl(0, 72%, 97%)",
    borderWidth: 1,
    borderColor: "hsl(0, 60%, 90%)",
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 15,
    ...buttonShadow,
  },
  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    opacity: 0.75,
  },
  buttonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  footer: {
    alignItems: "center",
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
  },
  footerRule: {
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },
  footerLogo: {
    width: 200,
    height: 28,
    marginBottom: spacing.sm,
    opacity: 0.85,
  },
  versionText: {
    fontSize: 12,
    color: colors.secondary,
    letterSpacing: 0.2,
  },
});
