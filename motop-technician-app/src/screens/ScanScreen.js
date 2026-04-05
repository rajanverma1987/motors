import React, { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { colors, spacing } from "../theme";

export default function ScanScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);

  const onBarcodeScanned = useCallback(
    ({ data }) => {
      if (locked) return;
      const raw = String(data || "").trim();
      if (!raw) return;
      setLocked(true);
      const jobNumber = raw.split(/[\n\r]/)[0].trim();
      navigation.replace("RfqWorkOrders", { jobNumber });
    },
    [locked, navigation]
  );

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.info}>Checking camera…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.info}>Camera access is needed to scan Tag QR codes (repair Job#).</Text>
        <Pressable style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Allow camera</Text>
        </Pressable>
        <Pressable style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={locked ? undefined : onBarcodeScanned}
      />
      <View style={styles.overlay}>
        <Text style={styles.hint}>Point at the motor tag QR (Job#)</Text>
        <Pressable style={styles.cancel} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.xl,
    paddingBottom: Platform.OS === "ios" ? 36 : spacing.xl,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  hint: {
    color: "#fff",
    fontSize: 15,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  cancel: {
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  cancelText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: "600",
  },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
    padding: spacing.xl,
  },
  info: {
    fontSize: 16,
    color: colors.secondary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  btn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  back: {
    marginTop: spacing.lg,
    alignItems: "center",
  },
  backText: {
    color: colors.primary,
    fontSize: 15,
  },
});
