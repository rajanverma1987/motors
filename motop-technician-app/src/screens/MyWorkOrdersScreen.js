import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  SectionList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { useTechAuth } from "../TechAuthContext";
import { techFetch } from "../api";
import { colors, spacing } from "../theme";
import { filterOpenWorkOrders } from "../lib/work-order-open-status";
import { getApiBaseForMessage } from "../api";

function formatUpdated(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function MyWorkOrdersScreen({ navigation }) {
  const { token } = useTechAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [workOrders, setWorkOrders] = useState([]);
  const [preInspections, setPreInspections] = useState([]);
  const [preInspectionWarning, setPreInspectionWarning] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    const [woResult, preResult] = await Promise.allSettled([
      techFetch("/api/tech/work-orders/my", { token }),
      techFetch("/api/tech/pre-inspections/my", { token }),
    ]);
    if (woResult.status === "fulfilled") {
      setWorkOrders(filterOpenWorkOrders(woResult.value.workOrders));
    } else {
      setWorkOrders([]);
      throw woResult.reason;
    }
    if (preResult.status === "fulfilled") {
      setPreInspections(
        Array.isArray(preResult.value.preInspections) ? preResult.value.preInspections : []
      );
      setPreInspectionWarning("");
    } else {
      setPreInspections([]);
      const msg = preResult.reason?.message || String(preResult.reason || "Failed to load pre-inspections");
      setPreInspectionWarning(msg);
      console.warn("Pre-inspections load failed:", msg);
    }
  }, [token]);

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

  const sections = useMemo(() => {
    const out = [];
    if (preInspections.length) {
      out.push({
        key: "pre",
        title: "Pre-inspection (Write-Up)",
        data: preInspections.map((row) => ({ ...row, listKind: "pre_inspection" })),
      });
    }
    if (workOrders.length) {
      out.push({
        key: "wo",
        title: "Work orders",
        data: workOrders.map((row) => ({ ...row, listKind: "work_order" })),
      });
    }
    return out;
  }, [preInspections, workOrders]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
      setError("");
    } catch (e) {
      setError(e.message || "Failed to load");
    } finally {
      setRefreshing(false);
    }
  };

  const openItem = (item) => {
    if (item.listKind === "pre_inspection") {
      navigation.navigate("PreInspectionDetail", { quoteId: item.id });
      return;
    }
    navigation.navigate("WorkOrderDetail", { id: item.id });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.muted}>Loading your jobs…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  const isEmpty = !preInspections.length && !workOrders.length;

  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <Text style={styles.bannerLabel}>Your jobs</Text>
        <Text style={styles.bannerSub}>
          Write-Up RFQs appear as pre-inspection assignments. Open work orders appear after the shop creates a
          work order from the RFQ.
        </Text>
        <Text style={styles.apiHint}>CRM: {getApiBaseForMessage()}</Text>
      </View>
      {preInspectionWarning ? (
        <View style={styles.preWarningBox}>
          <Text style={styles.preWarningTitle}>Pre-inspection list unavailable</Text>
          <Text style={styles.preWarningText}>{preInspectionWarning}</Text>
        </View>
      ) : null}
      <SectionList
        sections={sections}
        keyExtractor={(item) => `${item.listKind}-${item.id}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        stickySectionHeadersEnabled
        ListEmptyComponent={
          <Text style={styles.empty}>
            No assignments yet. Ask the office to assign you on a Write-Up RFQ or an open work order.
          </Text>
        }
        renderSectionHeader={({ section: { title } }) =>
          !isEmpty ? (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{title}</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const isPre = item.listKind === "pre_inspection";
          return (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => openItem(item)}
            >
              {isPre ? (
                <View style={styles.preBadge}>
                  <Text style={styles.preBadgeText}>Pre-inspection</Text>
                </View>
              ) : null}
              <Text style={styles.woNum}>
                {isPre ? item.rfqNumber || `RFQ ${item.id}` : item.workOrderNumber || item.id}
              </Text>
              <Text style={styles.status}>{isPre ? "Write-Up" : item.status || "—"}</Text>
              <Text style={styles.company} numberOfLines={1}>
                {item.companyName || "—"}
              </Text>
              {isPre && item.motorLabel ? (
                <Text style={styles.rfqSmall} numberOfLines={1}>
                  {item.motorLabel}
                </Text>
              ) : null}
              {!isPre && item.repairJobNumber ? (
                <Text style={styles.rfqSmall}>Job {item.repairJobNumber}</Text>
              ) : !isPre && item.quoteRfqNumber ? (
                <Text style={styles.rfqSmall}>RFQ {item.quoteRfqNumber}</Text>
              ) : null}
              {item.updatedAt ? (
                <Text style={styles.updatedSmall}>Updated {formatUpdated(item.updatedAt)}</Text>
              ) : null}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  muted: {
    marginTop: spacing.md,
    color: colors.secondary,
    fontSize: 15,
  },
  error: {
    color: colors.danger,
    fontSize: 16,
    textAlign: "center",
  },
  banner: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: spacing.lg,
  },
  bannerLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  bannerSub: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: colors.secondary,
    lineHeight: 20,
  },
  apiHint: {
    marginTop: spacing.sm,
    fontSize: 11,
    color: colors.secondary,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  preWarningBox: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: "rgba(220, 38, 38, 0.08)",
  },
  preWarningTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  preWarningText: {
    fontSize: 13,
    color: colors.title,
    lineHeight: 19,
  },
  sectionHeader: {
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    backgroundColor: colors.card,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowPressed: {
    opacity: 0.92,
  },
  preBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: spacing.sm,
  },
  preBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  woNum: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.title,
  },
  status: {
    marginTop: 4,
    fontSize: 14,
    color: colors.primary,
    fontWeight: "600",
  },
  company: {
    marginTop: 6,
    fontSize: 14,
    color: colors.secondary,
  },
  rfqSmall: {
    marginTop: 4,
    fontSize: 12,
    color: colors.secondary,
  },
  updatedSmall: {
    marginTop: 6,
    fontSize: 12,
    color: colors.secondary,
    fontStyle: "italic",
  },
  empty: {
    textAlign: "center",
    color: colors.secondary,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    fontSize: 15,
    lineHeight: 22,
  },
});
