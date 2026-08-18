import React, { useEffect, useState } from "react";
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
import {
  loadMonthlyProduct,
  purchaseMonthlySubscription,
  restoreMonthlySubscription,
  openSubscriptionManagement,
  friendlyIapError,
} from "../lib/subscription";

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
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");
  const [storePrice, setStorePrice] = useState("");
  const [hasIntroOffer, setHasIntroOffer] = useState(true);

  useEffect(() => {
    refreshAccount().catch(() => {});
    loadMonthlyProduct()
      .then((info) => {
        setStorePrice(info.displayPrice);
        setHasIntroOffer(!!info.hasIntroOffer);
      })
      .catch(() => {
        setStorePrice("$11.99 / month");
      });
  }, [refreshAccount]);

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile({ name, phone });
      Alert.alert("Saved", "Your profile was updated.");
    } catch (e) {
      Alert.alert("Could not save", e.message || "Try again.");
    } finally {
      setSaving(false);
    }
  };

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
      if (result?.restored) {
        Alert.alert("Restored", "Your subscription access was restored.");
      } else {
        Alert.alert("No purchases found", "We could not find an active subscription for this store account.");
      }
    } catch (e) {
      const msg = friendlyIapError(e);
      if (msg) Alert.alert("Restore purchases", msg);
    } finally {
      setBusy("");
    }
  };

  const manage = async () => {
    try {
      await openSubscriptionManagement();
    } catch {
      Alert.alert("Manage subscription", "Open the App Store or Google Play subscription settings to cancel or change your plan.");
    }
  };

  const subscribed = account?.unlocked && (account?.accessMode === "subscription" || account?.accessMode === "cancelled_until_period_end");
  const ctaLabel = hasIntroOffer ? "Start 3-Day Free Trial" : "Subscribe";

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
        disabled={saving}
        style={({ pressed }) => [styles.btn, pressed && styles.pressed, saving && styles.disabled]}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save profile</Text>}
      </Pressable>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Subscription</Text>
        <Text style={styles.status}>{statusCopy(account)}</Text>
        <Text style={styles.trialNote}>3-day free trial</Text>
        <Text style={styles.price}>{storePrice || "$11.99 / month"}</Text>
        {subscribed ? (
          <Pressable onPress={manage} style={styles.outline}>
            <Text style={styles.outlineText}>Manage subscription</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={startPurchase}
            disabled={!!busy}
            style={({ pressed }) => [styles.btn, pressed && styles.pressed, busy && styles.disabled]}
          >
            {busy === "purchase" ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{ctaLabel}</Text>}
          </Pressable>
        )}
        <Pressable onPress={restore} disabled={!!busy} style={styles.linkBtn}>
          {busy === "restore" ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.link}>Restore Purchases</Text>
          )}
        </Pressable>
      </View>

      <Pressable onPress={logout} style={styles.signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
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
  trialNote: { fontSize: 14, color: colors.secondary, marginTop: spacing.sm },
  price: { fontSize: 16, fontWeight: "800", color: colors.primary, marginVertical: spacing.md },
  outline: {
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  outlineText: { color: colors.danger, fontWeight: "700" },
  linkBtn: { marginTop: spacing.md, alignItems: "center", minHeight: 24 },
  link: { color: colors.primary, fontWeight: "700", fontSize: 14 },
  signOut: { alignItems: "center", paddingVertical: spacing.md },
  signOutText: { color: colors.secondary, fontWeight: "700", fontSize: 15 },
});
