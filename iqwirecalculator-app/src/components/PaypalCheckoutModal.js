import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  SafeAreaView,
} from "react-native";
import { WebView } from "react-native-webview";
import { colors, spacing } from "../theme";
import { getApiBase } from "../api";

export default function PaypalCheckoutModal({ visible, approvalUrl, onClose, onSuccess }) {
  const [loading, setLoading] = useState(true);
  const marker = "/mobile-app/paypal-complete";

  const onNav = (navState) => {
    const url = String(navState?.url || "");
    if (!url.includes(marker)) return;
    const success = !/[?&]status=cancel/.test(url);
    if (success) onSuccess();
    else onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>Subscribe with PayPal</Text>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>Close</Text>
          </Pressable>
        </View>
        {approvalUrl ? (
          <WebView
            source={{ uri: approvalUrl }}
            onNavigationStateChange={onNav}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            startInLoadingState
            style={styles.web}
          />
        ) : (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}
        {loading ? (
          <View style={styles.bar}>
            <Text style={styles.hint}>Secure checkout · {getApiBase().replace(/^https?:\/\//, "")}</Text>
          </View>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  title: { fontSize: 16, fontWeight: "800", color: colors.title },
  close: { fontSize: 16, fontWeight: "700", color: colors.primary },
  web: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  bar: { padding: spacing.sm, alignItems: "center", backgroundColor: colors.card },
  hint: { fontSize: 11, color: colors.secondary },
});
