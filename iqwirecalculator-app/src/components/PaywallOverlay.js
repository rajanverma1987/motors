import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "../theme";
import { useMobileAuth } from "../AuthContext";
import { appFetch, getApiBase } from "../api";
import PaypalCheckoutModal from "./PaypalCheckoutModal";

export default function PaywallOverlay() {
  const insets = useSafeAreaInsets();
  const { account, token, refreshAccount, logout } = useMobileAuth();
  const [busy, setBusy] = useState(false);
  const [approvalUrl, setApprovalUrl] = useState("");

  if (!account || account.unlocked) return null;

  const price = account.plan?.monthlyUsd;
  const currency = account.plan?.currency || "USD";
  const priceLabel =
    Number.isFinite(Number(price)) && Number(price) > 0
      ? `${currency} ${Number(price).toFixed(2)} / month`
      : "Monthly subscription";

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
      /* webhook may still activate */
    }
    await refreshAccount().catch(() => {});
  };

  return (
    <View style={[styles.overlay, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.card}>
        <View style={styles.iconBadge}>
          <Ionicons name="lock-closed" size={28} color="#fff" />
        </View>
        <Text style={styles.title}>Your free trial ended</Text>
        <Text style={styles.body}>
          Subscribe to keep using calculators, saved work, and upcoming video lessons. Cancel anytime from Profile.
        </Text>
        <Text style={styles.price}>{priceLabel}</Text>
        <Pressable
          onPress={startCheckout}
          disabled={busy}
          style={({ pressed }) => [styles.btn, pressed && styles.pressed, busy && styles.disabled]}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Subscribe with PayPal</Text>}
        </Pressable>
        <Pressable onPress={() => refreshAccount().catch(() => {})} style={styles.linkBtn}>
          <Text style={styles.link}>Already paid? Refresh access</Text>
        </Pressable>
        <Pressable onPress={logout} style={styles.linkBtn}>
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>
      <PaypalCheckoutModal
        visible={!!approvalUrl}
        approvalUrl={approvalUrl}
        onClose={() => setApprovalUrl("")}
        onSuccess={onPaypalSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "hsla(22, 20%, 8%, 0.55)",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    zIndex: 50,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: { fontSize: 22, fontWeight: "800", color: colors.title, textAlign: "center" },
  body: { fontSize: 14, color: colors.secondary, textAlign: "center", lineHeight: 21, marginTop: spacing.sm },
  price: { fontSize: 18, fontWeight: "800", color: colors.primary, marginVertical: spacing.lg },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    alignSelf: "stretch",
  },
  pressed: { opacity: 0.92 },
  disabled: { opacity: 0.75 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  linkBtn: { marginTop: spacing.md },
  link: { color: colors.primary, fontWeight: "700", fontSize: 14 },
  signOut: { color: colors.secondary, fontWeight: "600", fontSize: 14 },
});
