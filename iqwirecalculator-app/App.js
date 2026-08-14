import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { MobileAuthProvider, useMobileAuth } from "./src/AuthContext";
import MainTabs from "./src/navigation/MainTabs";
import { colors } from "./src/theme";
import LoginScreen from "./src/screens/LoginScreen";
import RegisterScreen from "./src/screens/RegisterScreen";
import AppSplashScreen from "./src/components/AppSplashScreen";
import PaywallOverlay from "./src/components/PaywallOverlay";

SplashScreen.preventAutoHideAsync().catch(() => {});

const Stack = createNativeStackNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.bg,
    card: colors.card,
    text: colors.title,
    border: colors.border,
    notification: colors.accent,
  },
};

function NavigationRoot() {
  const { loading, isLoggedIn } = useMobileAuth();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync().catch(() => {});
  }, [loading]);

  if (loading) return <AppSplashScreen />;

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        {!isLoggedIn ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <Stack.Screen name="MainTabs" component={LoggedInShell} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function LoggedInShell() {
  return (
    <View style={styles.fill}>
      <MainTabs />
      <PaywallOverlay />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MobileAuthProvider>
        <StatusBar style="dark" />
        <NavigationRoot />
      </MobileAuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
