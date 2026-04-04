import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useTechAuth } from "../TechAuthContext";
import { techFetch } from "../api";
import { colors, spacing } from "../theme";

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
  const [rows, setRows] = useState([]);

  const load = useCallback(async () => {
    if (!token) return;
    const data = await techFetch("/api/tech/work-orders/my", { token });
    setRows(Array.isArray(data.workOrders) ? data.workOrders : []);
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.muted}>Loading your work orders…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
        <Pressable style={styles.btn} onPress={() => navigation.goBack()}>
          <Text style={styles.btnText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.banner}>
        <Text style={styles.bannerLabel}>Your jobs</Text>
        <Text style={styles.bannerSub}>
          Open work orders assigned to you in this shop, newest activity first.
        </Text>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            No open work orders assigned to you. Assignments are set in the CRM, or use Scan, Job#/RFQ, or
            serial to find a job.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => navigation.navigate("WorkOrderDetail", { id: item.id })}
          >
            <Text style={styles.woNum}>{item.workOrderNumber || item.id}</Text>
            <Text style={styles.status}>{item.status || "—"}</Text>
            <Text style={styles.company} numberOfLines={1}>
              {item.companyName || "—"}
            </Text>
            {item.repairJobNumber ? (
              <Text style={styles.rfqSmall}>Job {item.repairJobNumber}</Text>
            ) : item.quoteRfqNumber ? (
              <Text style={styles.rfqSmall}>RFQ {item.quoteRfqNumber}</Text>
            ) : null}
            {item.updatedAt ? (
              <Text style={styles.updatedSmall}>Updated {formatUpdated(item.updatedAt)}</Text>
            ) : null}
          </Pressable>
        )}
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
    marginBottom: spacing.lg,
  },
  btn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
    borderRadius: 8,
  },
  btnText: {
    color: "#fff",
    fontWeight: "600",
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
  row: {
    backgroundColor: colors.card,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowPressed: {
    opacity: 0.92,
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
