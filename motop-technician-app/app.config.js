/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  expo: {
    name: "Motop Technician",
    slug: "motop-technician",
    /** Mobile-only — avoids EAS Update / export requiring react-native-web. */
    platforms: ["ios", "android"],
    version: "1.0.0",
    /** EAS Update — OTA JS bundles (requires new store build after adding this). */
    updates: {
      url: "https://u.expo.dev/429faf46-7e74-4a8b-95c0-db8c86b284b6",
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#f5f7fa",
    },
    ios: {
      bundleIdentifier: "com.motorswinding.motoptechnician",
      supportsTablet: true,
      infoPlist: {
        NSCameraUsageDescription:
          "Motop Technician uses the camera to scan RFQ QR codes printed from the CRM motor tags.",
        NSUserNotificationsUsageDescription:
          "Motop Technician sends alerts when a work order is assigned to you.",
        NSPhotoLibraryUsageDescription:
          "Motop Technician attaches before and after photos to your work orders.",
      },
    },
    android: {
      package: "com.motorswinding.motoptechnician",
      /** Resize window when keyboard opens so inputs stay visible (not covered). */
      softwareKeyboardLayoutMode: "resize",
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
    },
    plugins: [
      "expo-secure-store",
      [
        "expo-camera",
        {
          cameraPermission: "Allow Motop Technician to scan RFQ QR codes from motor tags.",
        },
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "Motop Technician saves before and after photos on work orders.",
          cameraPermission: "Motop Technician can take before and after photos on the shop floor.",
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/icon.png",
          color: "#1e5a8a",
          sounds: [],
          enableBackgroundRemoteNotifications: true,
        },
      ],
    ],
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:3000",
      eas: {
        projectId: "429faf46-7e74-4a8b-95c0-db8c86b284b6",
      },
    },
  },
};
