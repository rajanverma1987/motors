import React from "react";
import { Text, Pressable, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTechAuth } from "../TechAuthContext";
import { colors } from "../theme";
import SearchScreen from "../screens/SearchScreen";
import ScanScreen from "../screens/ScanScreen";
import RfqWorkOrdersScreen from "../screens/RfqWorkOrdersScreen";
import MyWorkOrdersScreen from "../screens/MyWorkOrdersScreen";
import WorkOrderDetailScreen from "../screens/WorkOrderDetailScreen";
import BookmarksScreen from "../screens/BookmarksScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.card },
  headerTintColor: colors.primary,
  headerTitleStyle: { color: colors.title, fontWeight: "700" },
  headerShadowVisible: true,
  contentStyle: { backgroundColor: colors.bg },
  headerBackTitleVisible: false,
  headerBackButtonDisplayMode: "minimal",
};

function HeaderSignOut() {
  const { logout } = useTechAuth();
  return (
    <Pressable onPress={logout} style={styles.signOutBtn} hitSlop={12}>
      <Text style={styles.signOutText}>Sign out</Text>
    </Pressable>
  );
}

const tabBarVisibleStyle = {
  backgroundColor: colors.card,
  borderTopColor: colors.border,
};

function tabBarStyleForRoute(route, homeScreenName) {
  const nested = getFocusedRouteNameFromRoute(route);
  const focused = nested ?? homeScreenName;
  return focused !== homeScreenName ? { display: "none" } : tabBarVisibleStyle;
}

function JobsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="JobsHome"
        component={MyWorkOrdersScreen}
        options={{
          title: "Jobs",
          headerRight: () => <HeaderSignOut />,
        }}
      />
      <Stack.Screen name="WorkOrderDetail" component={WorkOrderDetailScreen} options={{ title: "Work order" }} />
    </Stack.Navigator>
  );
}

function SearchStackNavigator() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="SearchHome"
        component={SearchScreen}
        options={{
          title: "Search",
          headerRight: () => <HeaderSignOut />,
        }}
      />
      <Stack.Screen name="Scan" component={ScanScreen} options={{ title: "Scan QR" }} />
      <Stack.Screen
        name="RfqWorkOrders"
        component={RfqWorkOrdersScreen}
        options={({ route }) => ({
          title: route.params?.serial ? "Open work orders" : "Work orders",
        })}
      />
      <Stack.Screen name="WorkOrderDetail" component={WorkOrderDetailScreen} options={{ title: "Work order" }} />
    </Stack.Navigator>
  );
}

function BookmarksStackNavigator() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="BookmarksHome"
        component={BookmarksScreen}
        options={{
          title: "Bookmarks",
          headerRight: () => <HeaderSignOut />,
        }}
      />
      <Stack.Screen name="WorkOrderDetail" component={WorkOrderDetailScreen} options={{ title: "Work order" }} />
    </Stack.Navigator>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.secondary,
        tabBarStyle: tabBarVisibleStyle,
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
      <Tab.Screen
        name="Jobs"
        component={JobsStackNavigator}
        options={({ route }) => ({
          tabBarLabel: "Jobs",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "briefcase" : "briefcase-outline"}
              size={size ?? 24}
              color={color}
            />
          ),
          tabBarStyle: tabBarStyleForRoute(route, "JobsHome"),
        })}
      />
      <Tab.Screen
        name="Search"
        component={SearchStackNavigator}
        options={({ route }) => ({
          tabBarLabel: "Search",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "search" : "search-outline"} size={size ?? 24} color={color} />
          ),
          tabBarStyle: tabBarStyleForRoute(route, "SearchHome"),
        })}
      />
      <Tab.Screen
        name="Bookmarks"
        component={BookmarksStackNavigator}
        options={({ route }) => ({
          tabBarLabel: "Bookmarks",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "bookmark" : "bookmark-outline"}
              size={size ?? 24}
              color={color}
            />
          ),
          tabBarStyle: tabBarStyleForRoute(route, "BookmarksHome"),
        })}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  signOutBtn: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  signOutText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
});
