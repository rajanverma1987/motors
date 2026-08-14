import React, { useMemo, useState } from "react";
import { View, Text, Pressable, Modal, FlatList, TextInput, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { allCountries } from "../lib/countries";
import { colors, spacing } from "../theme";

export default function CountryPickerField({ value, onChange }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const countries = useMemo(() => allCountries(), []);
  const selected = countries.find((c) => c.code === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  }, [countries, query]);

  return (
    <>
      <Text style={styles.label}>Country</Text>
      <Pressable
        onPress={() => {
          setQuery("");
          setOpen(true);
        }}
        style={({ pressed }) => [styles.inputRow, pressed && { opacity: 0.92 }]}
      >
        <Ionicons name="globe-outline" size={20} color={colors.secondary} style={{ marginRight: 8 }} />
        <Text style={[styles.value, !selected && styles.placeholder]}>
          {selected ? selected.name : "Select country"}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.secondary} />
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, 12) + (Platform.OS === "ios" ? 0 : 8) }]}>
          <Text style={styles.modalTitle}>Select country</Text>
          <Pressable onPress={() => setOpen(false)} hitSlop={12}>
            <Text style={styles.modalClose}>Done</Text>
          </Pressable>
        </View>
        <View style={styles.searchWrap}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search countries"
            placeholderTextColor={colors.secondary}
            style={styles.search}
            autoCorrect={false}
          />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.code}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          renderItem={({ item }) => {
            const active = item.code === value;
            return (
              <Pressable
                onPress={() => {
                  onChange(item.code);
                  setOpen(false);
                }}
                style={styles.row}
              >
                <Text style={[styles.rowName, active && styles.rowNameActive]}>{item.name}</Text>
                {active ? <Ionicons name="checkmark" size={22} color={colors.primary} /> : null}
              </Pressable>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>No countries match that search.</Text>}
        />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.formBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  value: { flex: 1, paddingVertical: 14, fontSize: 16, color: colors.text },
  placeholder: { color: colors.secondary },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.title },
  modalClose: { fontSize: 16, fontWeight: "700", color: colors.primary },
  searchWrap: { padding: spacing.md, backgroundColor: colors.bg },
  search: {
    backgroundColor: colors.formBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    minHeight: 48,
    fontSize: 16,
    color: colors.title,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    minHeight: 52,
  },
  rowName: { flex: 1, fontSize: 17, color: colors.title },
  rowNameActive: { fontWeight: "700", color: colors.primary },
  empty: { padding: spacing.lg, fontSize: 15, color: colors.secondary },
});
