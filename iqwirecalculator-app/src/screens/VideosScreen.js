import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors, spacing } from "../theme";

export default function VideosScreen() {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconBadge}>
        <Ionicons name="play-circle-outline" size={36} color="#fff" />
      </View>
      <Text style={styles.title}>Video lessons</Text>
      <Text style={styles.body}>
        Coming soon. We will add rewind and shop-floor video lessons here. Your subscription will include them as they
        launch.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: { fontSize: 22, fontWeight: "800", color: colors.title, marginBottom: spacing.md },
  body: { fontSize: 15, color: colors.secondary, textAlign: "center", lineHeight: 22, maxWidth: 320 },
});
