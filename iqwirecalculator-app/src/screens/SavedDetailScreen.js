import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { colors, spacing } from "../theme";

export default function SavedDetailScreen({ route }) {
  const item = route.params?.item || {};
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{item.title || "Saved calculation"}</Text>
      <Text style={styles.meta}>
        {item.calculatorType || ""}
        {item.createdAt ? ` · ${new Date(item.createdAt).toLocaleString()}` : ""}
      </Text>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Inputs</Text>
        <Text style={styles.pre}>{JSON.stringify(item.inputs || {}, null, 2)}</Text>
      </View>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Results</Text>
        <Text style={styles.pre}>{JSON.stringify(item.results || {}, null, 2)}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: "800", color: colors.title },
  meta: { fontSize: 13, color: colors.secondary, marginTop: 6, marginBottom: spacing.lg },
  panel: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  panelTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.title,
    marginBottom: spacing.md,
  },
  pre: { fontSize: 13, color: colors.text, lineHeight: 20, fontFamily: undefined },
});
