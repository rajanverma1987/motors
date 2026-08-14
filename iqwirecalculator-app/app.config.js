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
    },
    runtimeVersion: {
      policy: "sdkVersion",
    },
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash-screen.png",
      resizeMode: "contain",
      backgroundColor: "#FDFCFB",
    },
    ios: {
      bundleIdentifier: "com.iqmotorbase.iqwirecalculator",
      supportsTablet: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSAppTransportSecurity: {
          NSAllowsLocalNetworking: true,
        },
      },
    },
    android: {
      package: "com.iqmotorbase.iqwirecalculator",
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
          image: "./assets/splash-screen.png",
          resizeMode: "contain",
        },
      ],
      "expo-secure-store",
      "expo-updates",
    ],
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || "http://127.0.0.1:3000",
      eas: {
        projectId: "ff4835bb-e49f-4d39-83d4-6590b5119ea2",
      },
    },
  },
};
