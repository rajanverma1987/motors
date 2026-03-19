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

export default function RfqWorkOrdersScreen({ route, navigation }) {
  const { rfq, serial } = route.params || {};
  const { token } = useTechAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [quote, setQuote] = useState(null);
  const [motorInfo, setMotorInfo] = useState(null);
  const [rows, setRows] = useState([]);

  const mode = serial ? "serial" : "rfq";

  const load = useCallback(async () => {
    if (!token) return;
    if (mode === "serial") {
      const s = String(serial || "").trim();
      if (!s) return;
      const path = `/api/tech/motor-serial/${encodeURIComponent(s)}/work-orders`;
      const data = await techFetch(path, { token });
      setQuote(null);
      setMotorInfo(data.motor || null);
      setRows(Array.isArray(data.workOrders) ? data.workOrders : []);
      return;
    }
    const r = String(rfq || "").trim();
    if (!r) return;
    const path = `/api/tech/rfq/${encodeURIComponent(r)}/work-orders`;
    const data = await techFetch(path, { token });
    setQuote(data.quote || null);
    setMotorInfo(null);
    setRows(Array.isArray(data.workOrders) ? data.workOrders : []);
  }, [token, mode, rfq, serial]);

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
        <Text style={styles.muted}>Loading work orders…</Text>
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
        {mode === "serial" ? (
          <>
            <Text style={styles.rfqLabel}>Motor serial</Text>
            <Text style={styles.rfqValue}>{motorInfo?.serialNumber || serial}</Text>
            {motorInfo?.manufacturer || motorInfo?.model ? (
              <Text style={styles.quoteStatus}>
                {[motorInfo.manufacturer, motorInfo.model].filter(Boolean).join(" · ")}
              </Text>
            ) : null}
            {motorInfo?.matchCount > 1 ? (
              <Text style={styles.quoteStatus}>
                {motorInfo.matchCount} motors match this serial — showing open work orders for all.
              </Text>
            ) : null}
            <Text style={styles.openHint}>Only open (active) work orders are listed.</Text>
          </>
        ) : (
          <>
            <Text style={styles.rfqLabel}>RFQ</Text>
            <Text style={styles.rfqValue}>{quote?.rfqNumber || rfq}</Text>
            {quote?.status ? (
              <Text style={styles.quoteStatus}>Quote: {quote.status}</Text>
            ) : null}
          </>
        )}
      </View>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {mode === "serial"
              ? "No open work orders for this motor."
              : "No work orders for this RFQ yet."}
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
            {item.quoteRfqNumber ? (
              <Text style={styles.rfqSmall}>RFQ {item.quoteRfqNumber}</Text>
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
  rfqLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  rfqValue: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.title,
    marginTop: 4,
  },
  quoteStatus: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: colors.secondary,
  },
  openHint: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.secondary,
    fontStyle: "italic",
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
  empty: {
    textAlign: "center",
    color: colors.secondary,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    fontSize: 15,
  },
});
