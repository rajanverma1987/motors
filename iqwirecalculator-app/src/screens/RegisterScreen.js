import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMobileAuth } from "../AuthContext";
import { colors, spacing } from "../theme";
import CountryPickerField from "../components/CountryPickerField";

export default function RegisterScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { register } = useMobileAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async () => {
    setError("");
    if (!country) {
      setError("Please select your country.");
      return;
    }
    setBusy(true);
    try {
      await register({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
        country,
      });
    } catch (e) {
      setError(e.message || "Could not create account");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.outer}>
      <View style={[styles.hero, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text style={styles.backText}>Sign in</Text>
        </Pressable>
        <Text style={styles.heroTitle}>Join IQWireCalculator</Text>
        <Text style={styles.heroSub}>3-day free trial. Not tied to a shop CRM login.</Text>
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.inner, { paddingBottom: insets.bottom + 24 }]}
        >
          <View style={styles.card}>
            <Field icon="person-outline" label="Name" value={name} onChangeText={setName} autoCapitalize="words" />
            <Field icon="call-outline" label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <CountryPickerField value={country} onChange={setCountry} />
            <Field
              icon="mail-outline"
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Field
              icon="lock-closed-outline"
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              style={({ pressed }) => [styles.button, pressed && { opacity: 0.92 }, busy && { opacity: 0.75 }]}
              onPress={onSubmit}
              disabled={busy}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Start free trial</Text>}
            </Pressable>
          </View>
          <Image source={require("../../assets/iqmotorbase-logo.png")} style={styles.logo} resizeMode="contain" />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ icon, label, ...rest }) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <Ionicons name={icon} size={20} color={colors.secondary} style={{ marginRight: 8 }} />
        <TextInput style={styles.input} placeholderTextColor={colors.secondary} {...rest} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  hero: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    backgroundColor: "hsl(28, 32%, 93%)",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  back: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  backText: { color: colors.primary, fontWeight: "700", fontSize: 16 },
  heroTitle: { fontSize: 24, fontWeight: "800", color: colors.title },
  heroSub: { fontSize: 14, color: colors.secondary, marginTop: 6, lineHeight: 20 },
  inner: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
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
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: colors.text },
  error: { color: colors.danger, marginBottom: spacing.md, fontSize: 14 },
  button: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 15, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 17 },
  logo: { width: 200, height: 28, alignSelf: "center", marginTop: spacing.xl, opacity: 0.85 },
});
