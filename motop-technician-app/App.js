import React, { useEffect } from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { TechAuthProvider, useTechAuth } from "./src/TechAuthContext";
import { BookmarksProvider } from "./src/BookmarksContext";
import { navigationRef } from "./src/navigationRef";
import { subscribeWorkOrderNotificationNavigation } from "./src/pushNotifications";
import MainTabs from "./src/navigation/MainTabs";
import { colors } from "./src/theme";
import LoginScreen from "./src/screens/LoginScreen";
import AppSplashScreen from "./src/components/AppSplashScreen";

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
  const { loading, isLoggedIn } = useTechAuth();

  useEffect(() => {
    return subscribeWorkOrderNotificationNavigation(isLoggedIn);
  }, [isLoggedIn]);

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loading]);

  if (loading) {
    return <AppSplashScreen />;
  }

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        {!isLoggedIn ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="MainTabs" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <TechAuthProvider>
        <BookmarksProvider>
          <StatusBar style="dark" />
          <NavigationRoot />
        </BookmarksProvider>
      </TechAuthProvider>
    </SafeAreaProvider>
  );
}
