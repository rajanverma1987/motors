import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { useTechAuth } from "../TechAuthContext";
import { useBookmarks } from "../BookmarksContext";
import { colors, spacing } from "../theme";

/**
 * Bookmarks tab: saved work orders on this device.
 */
export default function BookmarksScreen({ navigation }) {
  const { logout } = useTechAuth();
  const { bookmarks, removeBookmark, bookmarksReady } = useBookmarks();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.lead}>
        Bookmarked work orders are stored only on this device. Tap a row to open the job.
      </Text>

      {!bookmarksReady ? (
        <Text style={styles.muted}>Loading…</Text>
      ) : bookmarks.length === 0 ? (
        <Text style={styles.empty}>
          No bookmarks yet. Open a work order and tap <Text style={styles.emptyStrong}>Bookmark</Text> in
          the header to save it here.
        </Text>
      ) : (
        <View style={styles.list}>
          {bookmarks.map((item) => (
            <View key={item.id} style={styles.bmRow}>
              <Pressable
                style={styles.bmMain}
                onPress={() => navigation.navigate("WorkOrderDetail", { id: item.id })}
              >
                <Text style={styles.bmWo}>{item.workOrderNumber || item.id}</Text>
                <Text style={styles.bmSub} numberOfLines={1}>
                  {item.companyName || "—"}
                  {item.repairJobNumber
                    ? ` · Job ${item.repairJobNumber}`
                    : item.quoteRfqNumber
                      ? ` · RFQ ${item.quoteRfqNumber}`
                      : ""}
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.bmRemove, pressed && styles.pressed]}
                onPress={() => removeBookmark(item.id)}
                hitSlop={8}
              >
                <Text style={styles.bmRemoveText}>Remove</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View style={styles.footerSpacer} />

      <Pressable style={({ pressed }) => [styles.logout, pressed && styles.pressed]} onPress={logout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: 120,
  },
  lead: {
    fontSize: 14,
    color: colors.secondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  muted: {
    fontSize: 15,
    color: colors.secondary,
  },
  empty: {
    fontSize: 15,
    color: colors.secondary,
    lineHeight: 22,
    marginTop: spacing.md,
  },
  emptyStrong: {
    fontWeight: "700",
    color: colors.title,
  },
  list: {
    marginTop: spacing.sm,
  },
  bmRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    overflow: "hidden",
  },
  bmMain: {
    flex: 1,
    padding: spacing.md,
  },
  bmWo: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.title,
  },
  bmSub: {
    marginTop: 4,
    fontSize: 13,
    color: colors.secondary,
  },
  bmRemove: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  bmRemoveText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.88,
  },
  footerSpacer: {
    height: spacing.xl,
  },
  logout: {
    paddingVertical: 12,
    alignItems: "center",
  },
  logoutText: {
    color: colors.secondary,
    fontSize: 15,
  },
});
