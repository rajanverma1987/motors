import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "../theme";
import { useMobileAuth } from "../AuthContext";
import {
  loadMonthlyProduct,
  purchaseMonthlySubscription,
  restoreMonthlySubscription,
  friendlyIapError,
} from "../lib/subscription";

export default function PaywallOverlay() {
  const insets = useSafeAreaInsets();
  const { account, token, refreshAccount, logout } = useMobileAuth();
  const [busy, setBusy] = useState("");
  const [storePrice, setStorePrice] = useState("$11.99 / month");
  const [hasIntroOffer, setHasIntroOffer] = useState(true);

  useEffect(() => {
    if (!account || account.unlocked) return;
    loadMonthlyProduct()
      .then((info) => {
        setStorePrice(info.displayPrice);
        setHasIntroOffer(!!info.hasIntroOffer);
      })
      .catch(() => {});
  }, [account]);

  if (!account || account.unlocked) return null;

  const startPurchase = async () => {
    if (busy) return;
    setBusy("purchase");
    try {
      const result = await purchaseMonthlySubscription(token);
      if (result?.cancelled) return;
      if (result?.pending) {
        Alert.alert("Purchase pending", "Your purchase is pending.");
        return;
      }
      await refreshAccount().catch(() => {});
    } catch (e) {
      const msg = friendlyIapError(e);
      if (msg) Alert.alert("Subscription", msg);
    } finally {
      setBusy("");
    }
  };

  const restore = async () => {
    if (busy) return;
    setBusy("restore");
    try {
      const result = await restoreMonthlySubscription(token);
      await refreshAccount().catch(() => {});
      if (!result?.restored) {
        Alert.alert("No purchases found", "We could not find an active subscription for this store account.");
      }
    } catch (e) {
      const msg = friendlyIapError(e);
      if (msg) Alert.alert("Restore purchases", msg);
    } finally {
      setBusy("");
    }
  };

  const ctaLabel = hasIntroOffer ? "Start 3-Day Free Trial" : "Subscribe";

  return (
    <View style={[styles.overlay, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.card}>
        <View style={styles.iconBadge}>
          <Ionicons name="lock-closed" size={28} color="#fff" />
        </View>
        <Text style={styles.title}>Your free trial ended</Text>
        <Text style={styles.body}>
          Start a 3-day free trial, then {storePrice}. Cancel anytime from Profile.
        </Text>
        <Text style={styles.price}>{storePrice}</Text>
        <Pressable
          onPress={startPurchase}
          disabled={!!busy}
          style={({ pressed }) => [styles.btn, pressed && styles.pressed, busy && styles.disabled]}
        >
          {busy === "purchase" ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{ctaLabel}</Text>}
        </Pressable>
        <Pressable onPress={restore} disabled={!!busy} style={styles.linkBtn}>
          {busy === "restore" ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.link}>Restore Purchases</Text>
          )}
        </Pressable>
        <Pressable onPress={() => refreshAccount().catch(() => {})} style={styles.linkBtn}>
          <Text style={styles.link}>Already paid? Refresh access</Text>
        </Pressable>
        <Pressable onPress={logout} style={styles.linkBtn}>
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>
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
