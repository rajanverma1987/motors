/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  expo: {
    name: "IQWireCalculator",
    slug: "iqwirecalculator",
    owner: "iqmotorbase",
    platforms: ["ios", "android"],
    version: "1.0.0",
    updates: {
      url: "https://u.expo.dev/ff4835bb-e49f-4d39-83d4-6590b5119ea2",
      fallbackToCacheTimeout: 0,
    },
    runtimeVersion: {
      policy: "sdkVersion",
    },
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#FDFCFB",
    },
    ios: {
      bundleIdentifier: "com.iqmotorbase.iqwirecalculator",
      buildNumber: "4",
      appleTeamId: "5Y4532JU55",
      supportsTablet: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSLocalNetworkUsageDescription:
          "IQWireCalculator uses the local network to load the development JavaScript bundle from your computer.",
        NSBonjourServices: ["_expo._tcp", "_metro._tcp"],
      },
    },
    android: {
      package: "com.iqwirecalculator.iqmotorbase.com",
      versionCode: 5,
      softwareKeyboardLayoutMode: "resize",
      adaptiveIcon: {
        backgroundColor: "#FDFCFB",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
    },
    scheme: "iqwirecalculator",
    plugins: [
      [
        "expo-splash-screen",
        {
          backgroundColor: "#FDFCFB",
          image: "./assets/splash-icon.png",
          imageWidth: 220,
          resizeMode: "contain",
        },
      ],
      "expo-font",
      "expo-secure-store",
      "expo-updates",
      "expo-iap",
      "expo-mail-composer",
    ],
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "https://iqmotorbase.com",
      eas: {
        projectId: "ff4835bb-e49f-4d39-83d4-6590b5119ea2",
      },
    },
  },
};
