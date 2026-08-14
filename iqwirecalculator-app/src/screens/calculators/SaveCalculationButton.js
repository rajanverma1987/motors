import React, { useState } from "react";
import { Pressable, Text, ActivityIndicator, StyleSheet, Alert } from "react-native";
import { useMobileAuth } from "../../AuthContext";
import { appFetch } from "../../api";
import { colors, spacing } from "../../theme";

export function SaveCalculationButton({ calculatorType, title, getPayload }) {
  const { token, unlocked } = useMobileAuth();
  const [busy, setBusy] = useState(false);

  const onSave = async () => {
    if (!unlocked) {
      Alert.alert("Subscribe to save", "Your trial has ended. Subscribe to save calculations.");
      return;
    }
    const payload = typeof getPayload === "function" ? getPayload() : {};
    setBusy(true);
    try {
      await appFetch("/api/mobile-app/saved", {
        token,
        method: "POST",
        body: {
          calculatorType,
          title: payload.title || title,
          inputs: payload.inputs || {},
          results: payload.results || {},
        },
      });
      Alert.alert("Saved", "You can open this later from the Calcs tab.");
    } catch (e) {
      Alert.alert("Could not save", e.message || "Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      onPress={onSave}
      disabled={busy}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed, busy && styles.disabled]}
    >
      {busy ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.text}>Save this calculation</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: spacing.lg,
    backgroundColor: colors.card,
  },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.7 },
  text: { color: colors.primary, fontWeight: "700", fontSize: 15 },
});
