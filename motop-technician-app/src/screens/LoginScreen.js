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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTechAuth } from "../TechAuthContext";
import { colors, spacing } from "../theme";
import { useCenterFieldInScroll } from "../useCenterFieldInScroll";

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
    <KeyboardAvoidingView
      style={styles.outer}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
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
          { paddingTop: insets.top + spacing.xl },
        ]}
      >
        <View style={styles.card}>
          <Text style={styles.brand}>Motop Technician</Text>
          <Text style={styles.sub}>Sign in with your employee email and password from the CRM.</Text>
          <Text style={styles.label}>Email</Text>
          <View collapsable={false} ref={emailWrapRef}>
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
            />
          </View>
          <Text style={styles.label}>Password</Text>
          <View collapsable={false} ref={passwordWrapRef}>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              onFocus={() => scrollFieldToCenter(passwordWrapRef.current)}
              placeholder="Password"
              placeholderTextColor={colors.secondary}
              secureTextEntry
            />
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, busy && styles.buttonDisabled]}
            onPress={onSubmit}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  /** Top-aligned so the keyboard only lifts content by ~keyboard height, not re-centered into a tiny band. */
  scrollInner: {
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingHorizontal: spacing.xl,
    paddingBottom: 10,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  brand: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.title,
    marginBottom: spacing.sm,
  },
  sub: {
    fontSize: 14,
    color: colors.secondary,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.title,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.formBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
