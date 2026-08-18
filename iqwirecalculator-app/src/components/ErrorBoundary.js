import React from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { colors, spacing } from "../theme";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    const message = String(this.state.error?.message || this.state.error || "Unknown error");
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>IQWireCalculator hit a problem</Text>
        <Text style={styles.body}>
          The last TestFlight build was crashing before this screen. Send this message to support if it happens
          again.
        </Text>
        <ScrollView style={styles.box} contentContainerStyle={{ padding: spacing.md }}>
          <Text style={styles.mono} selectable>
            {message}
          </Text>
        </ScrollView>
        <Pressable
          onPress={() => this.setState({ error: null })}
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.9 }]}
        >
          <Text style={styles.btnText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl, justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800", color: colors.title, marginBottom: spacing.sm },
  body: { fontSize: 15, color: colors.secondary, lineHeight: 22, marginBottom: spacing.lg },
  box: { maxHeight: 180, backgroundColor: colors.formBg, borderRadius: 10, borderWidth: 1, borderColor: colors.border },
  mono: { fontSize: 12, color: colors.text, lineHeight: 18 },
  btn: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
