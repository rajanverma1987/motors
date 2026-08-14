import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, formFieldLabel } from "../theme";
import { useMobileAuth } from "../AuthContext";
import { appFetch, getApiBase } from "../api";
import PaypalCheckoutModal from "../components/PaypalCheckoutModal";

function statusCopy(account) {
  if (!account) return "";
  if (account.accessMode === "trial") {
    const ends = account.trialEndsAt ? new Date(account.trialEndsAt).toLocaleDateString() : "";
    return `Free trial until ${ends}`;
  }
  if (account.accessMode === "subscription") {
    const ends = account.currentPeriodEndsAt ? new Date(account.currentPeriodEndsAt).toLocaleDateString() : "";
    return `Active · renews around ${ends}`;
  }
  if (account.accessMode === "cancelled_until_period_end") {
    const ends = account.currentPeriodEndsAt ? new Date(account.currentPeriodEndsAt).toLocaleDateString() : "";
    return `Cancels ${ends}`;
  }
  if (account.accessMode === "grace") return "Payment issue — access continues during a short grace period";
  return "Locked — subscribe to continue";
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { account, token, updateProfile, logout, refreshAccount } = useMobileAuth();
  const [name, setName] = useState(account?.name || "");
  const [phone, setPhone] = useState(account?.phone || "");
  const [busy, setBusy] = useState(false);
  const [approvalUrl, setApprovalUrl] = useState("");

  const price = account?.plan?.monthlyUsd;
  const currency = account?.plan?.currency || "USD";
  const priceLabel =
    Number.isFinite(Number(price)) && Number(price) > 0
      ? `${currency} ${Number(price).toFixed(2)} / month`
      : "Monthly subscription";

  const save = async () => {
    setBusy(true);
    try {
      await updateProfile({ name, phone });
      Alert.alert("Saved", "Your profile was updated.");
    } catch (e) {
      Alert.alert("Could not save", e.message || "Try again.");
    } finally {
      setBusy(false);
    }
  };

  const startCheckout = async () => {
    setBusy(true);
    try {
      const data = await appFetch("/api/mobile-app/checkout/subscribe", {
        token,
        method: "POST",
        body: { returnBase: getApiBase() },
      });
      if (!data.approvalUrl) throw new Error("PayPal did not return a checkout link.");
      setApprovalUrl(data.approvalUrl);
    } catch (e) {
      Alert.alert("Checkout unavailable", e.message || "Try again later.");
    } finally {
      setBusy(false);
    }
  };

  const onPaypalSuccess = async () => {
    setApprovalUrl("");
    try {
      await appFetch("/api/mobile-app/checkout/activate-return", { token, method: "POST" });
    } catch {
      /* ignore */
    }
    await refreshAccount().catch(() => {});
  };

  const cancelSub = () => {
    Alert.alert(
      "Cancel subscription",
      "You will keep access until the end of the current billing period. This cannot be undone from here.",
      [
        { text: "Keep subscription", style: "cancel" },
        {
          text: "Cancel subscription",
          style: "destructive",
          onPress: async () => {
            try {
              await appFetch("/api/mobile-app/subscription", { token, method: "DELETE" });
              await refreshAccount();
              Alert.alert("Cancelled", "Access continues until the period end date.");
            } catch (e) {
              Alert.alert("Could not cancel", e.message || "Try again.");
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
      <Text style={styles.h1}>Profile</Text>
      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} autoCapitalize="words" />
      <Text style={styles.label}>Phone</Text>
      <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Text style={styles.label}>Email</Text>
      <Text style={styles.readonly}>{account?.email || ""}</Text>

      <Pressable
        onPress={save}
        disabled={busy}
        style={({ pressed }) => [styles.btn, pressed && styles.pressed, busy && styles.disabled]}
      >
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save profile</Text>}
      </Pressable>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Subscription</Text>
        <Text style={styles.status}>{statusCopy(account)}</Text>
        <Text style={styles.price}>{priceLabel}</Text>
        {account?.unlocked && account?.accessMode === "subscription" ? (
          <Pressable onPress={cancelSub} style={styles.outline}>
            <Text style={styles.outlineText}>Cancel subscription</Text>
          </Pressable>
        ) : (
          <Pressable onPress={startCheckout} style={styles.btn}>
            <Text style={styles.btnText}>Subscribe with PayPal</Text>
          </Pressable>
        )}
      </View>

      <Pressable onPress={logout} style={styles.signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>

      <PaypalCheckoutModal
        visible={!!approvalUrl}
        approvalUrl={approvalUrl}
        onClose={() => setApprovalUrl("")}
        onSuccess={onPaypalSuccess}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  h1: { fontSize: 22, fontWeight: "800", color: colors.title, marginBottom: spacing.lg },
  label: { ...formFieldLabel },
  input: {
    backgroundColor: colors.formBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.title,
    marginBottom: spacing.md,
  },
  readonly: {
    fontSize: 16,
    color: colors.secondary,
    marginBottom: spacing.lg,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  pressed: { opacity: 0.92 },
  disabled: { opacity: 0.75 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  panel: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  panelTitle: { fontSize: 12, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase", color: colors.title },
  status: { fontSize: 15, color: colors.text, marginTop: spacing.sm, lineHeight: 22 },
  price: { fontSize: 16, fontWeight: "800", color: colors.primary, marginVertical: spacing.md },
  outline: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  outlineText: { color: colors.danger, fontWeight: "700" },
  signOut: { alignItems: "center", paddingVertical: spacing.md },
  signOutText: { color: colors.secondary, fontWeight: "700", fontSize: 15 },
});
