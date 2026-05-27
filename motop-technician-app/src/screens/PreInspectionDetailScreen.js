import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useTechAuth } from "../TechAuthContext";
import { techFetch } from "../api";
import { useCenterFieldInScroll } from "../useCenterFieldInScroll";
import QuotePreInspectionSection from "../components/QuotePreInspectionSection";
import { colors, spacing } from "../theme";

export default function PreInspectionDetailScreen({ route, navigation }) {
  const quoteId = String(route.params?.quoteId || "").trim();
  const { token } = useTechAuth();
  const headerHeight = useHeaderHeight();
  const scrollRef = useRef(null);
  const { scrollToCenterField } = useCenterFieldInScroll(scrollRef, headerHeight);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    if (!token || !quoteId) return;
    const data = await techFetch(`/api/tech/pre-inspections/${quoteId}`, { token });
    setDetail(data);
  }, [token, quoteId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        await load();
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  useEffect(() => {
    if (detail?.quote?.rfqNumber) {
      navigation.setOptions({ title: `Pre-inspection · ${detail.quote.rfqNumber}` });
    }
  }, [detail, navigation]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.muted}>Loading pre-inspection…</Text>
      </View>
    );
  }

  if (error || !detail) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error || "Not found"}</Text>
      </View>
    );
  }

  const { quote, companyName, motor, motorClass } = detail;
  const motorLine = motor
    ? [motor.serialNumber, motor.manufacturer, motor.model].filter(Boolean).join(" · ")
    : "—";

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.badgeRow}>
          <View style={styles.kindBadge}>
            <Text style={styles.kindBadgeText}>Pre-inspection</Text>
          </View>
          <Text style={styles.statusText}>Write-Up</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>RFQ #</Text>
          <Text style={styles.value}>{quote.rfqNumber || "—"}</Text>
          <Text style={[styles.label, styles.labelSpaced]}>Customer</Text>
          <Text style={styles.value}>{companyName || "—"}</Text>
          <Text style={[styles.label, styles.labelSpaced]}>Motor</Text>
          <Text style={styles.value}>{motorLine}</Text>
          {quote.customerPo ? (
            <>
              <Text style={[styles.label, styles.labelSpaced]}>Customer PO</Text>
              <Text style={styles.value}>{quote.customerPo}</Text>
            </>
          ) : null}
          {quote.estimatedCompletion ? (
            <>
              <Text style={[styles.label, styles.labelSpaced]}>Est. completion</Text>
              <Text style={styles.value}>{quote.estimatedCompletion}</Text>
            </>
          ) : null}
        </View>

        <QuotePreInspectionSection
          quoteId={quoteId}
          motorClass={motorClass || "AC"}
          token={token}
          onFieldFocus={scrollToCenterField}
          onCompleted={() => {
            navigation.goBack();
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: 120 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
    backgroundColor: colors.bg,
  },
  muted: { marginTop: spacing.md, color: colors.secondary },
  error: { color: colors.danger, fontSize: 16, textAlign: "center" },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  kindBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  kindBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.secondary,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  labelSpaced: { marginTop: spacing.md },
  value: {
    marginTop: 4,
    fontSize: 16,
    color: colors.title,
  },
});
