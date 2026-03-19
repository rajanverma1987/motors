import React, { useEffect } from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { TechAuthProvider, useTechAuth } from "./src/TechAuthContext";
import { BookmarksProvider } from "./src/BookmarksContext";
import { navigationRef } from "./src/navigationRef";
import { subscribeWorkOrderNotificationNavigation } from "./src/pushNotifications";
import { colors } from "./src/theme";
import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import ScanScreen from "./src/screens/ScanScreen";
import RfqWorkOrdersScreen from "./src/screens/RfqWorkOrdersScreen";
import WorkOrderDetailScreen from "./src/screens/WorkOrderDetailScreen";

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
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.title, fontWeight: "700" },
          headerShadowVisible: true,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        {!isLoggedIn ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: "Motop Technician" }} />
            <Stack.Screen name="Scan" component={ScanScreen} options={{ title: "Scan QR" }} />
            <Stack.Screen
              name="RfqWorkOrders"
              component={RfqWorkOrdersScreen}
              options={({ route }) => ({
                title: route.params?.serial ? "Open work orders" : "Work orders",
              })}
            />
            <Stack.Screen
              name="WorkOrderDetail"
              component={WorkOrderDetailScreen}
              options={{ title: "Work order" }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <TechAuthProvider>
      <BookmarksProvider>
        <StatusBar style="dark" />
        <NavigationRoot />
      </BookmarksProvider>
    </TechAuthProvider>
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
