import React, { useEffect } from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { TechAuthProvider, useTechAuth } from "./src/TechAuthContext";
import { BookmarksProvider } from "./src/BookmarksContext";
import { navigationRef } from "./src/navigationRef";
import { subscribeWorkOrderNotificationNavigation } from "./src/pushNotifications";
import MainTabs from "./src/navigation/MainTabs";
import { colors } from "./src/theme";
import LoginScreen from "./src/screens/LoginScreen";

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

  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
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

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
});
