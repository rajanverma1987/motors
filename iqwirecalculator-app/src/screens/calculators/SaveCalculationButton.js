import React, { useState } from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Modal,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMobileAuth } from "../../AuthContext";
import { appFetch } from "../../api";
import { colors, spacing } from "../../theme";

export function SaveCalculationButton({ calculatorType, title, getPayload, onSaved, disabled }) {
  const insets = useSafeAreaInsets();
  const { token, unlocked } = useMobileAuth();
  const [busy, setBusy] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [saveName, setSaveName] = useState("");

  const openNamePrompt = () => {
    if (!unlocked) {
      Alert.alert("Subscribe to save", "Your trial has ended. Subscribe to save calculations.");
      return;
    }
    if (disabled) {
      Alert.alert("No results", "Calculate Best Match first, then save.");
      return;
    }
    setSaveName("");
    setNameOpen(true);
  };

  const onSave = async () => {
    const name = String(saveName || "").trim();
    if (!name) {
      Alert.alert("Name required", "Enter a name for this calculation.");
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
          title: name,
          inputs: payload.inputs || {},
          results: payload.results || {},
        },
      });
      setNameOpen(false);
      if (typeof onSaved === "function") onSaved();
      Alert.alert("Saved", `Saved as “${name}”.`);
    } catch (e) {
      Alert.alert("Could not save", e.message || "Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Pressable
        onPress={openNamePrompt}
        disabled={busy}
        style={({ pressed }) => [styles.btn, pressed && styles.pressed, busy && styles.disabled]}
      >
        {busy ? <ActivityIndicator color={colors.primary} /> : <Text style={styles.text}>Save this calculation</Text>}
      </Pressable>

      <Modal visible={nameOpen} animationType="slide" onRequestClose={() => setNameOpen(false)}>
        <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, 12) }]}>
            <Text style={styles.modalTitle}>Save calculation</Text>
            <View style={styles.headerActions}>
              <Pressable onPress={() => setNameOpen(false)} hitSlop={12} disabled={busy}>
                <Text style={styles.modalClose}>Cancel</Text>
              </Pressable>
              <Pressable onPress={onSave} hitSlop={12} disabled={busy}>
                <Text style={styles.modalSave}>Save</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.modalBody}>
            <Text style={styles.label}>Calculation name</Text>
            <TextInput
              style={styles.input}
              value={saveName}
              onChangeText={setSaveName}
              placeholder={title || "Name"}
              placeholderTextColor={colors.secondary}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={onSave}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
  },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.7 },
  text: { color: colors.primary, fontWeight: "700", fontSize: 15 },
  modalRoot: { flex: 1, backgroundColor: colors.bg },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.title },
  modalClose: { fontSize: 16, fontWeight: "700", color: colors.secondary },
  modalSave: { fontSize: 16, fontWeight: "700", color: colors.primary },
  modalBody: { padding: spacing.lg },
  label: { fontSize: 16, fontWeight: "600", color: colors.title, marginBottom: 8 },
  input: {
    backgroundColor: colors.formBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    minHeight: 52,
    fontSize: 18,
    color: colors.title,
  },
});
