import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { colors } from "../theme";
import CalcsHomeScreen from "../screens/CalcsHomeScreen";
import SavedDetailScreen from "../screens/SavedDetailScreen";
import VideosScreen from "../screens/VideosScreen";
import ProfileScreen from "../screens/ProfileScreen";
import CmBestMatchScreen from "../screens/calculators/CmBestMatchScreen";
import PowerCurrentScreen from "../screens/calculators/PowerCurrentScreen";
import SpeedDrivesScreen from "../screens/calculators/SpeedDrivesScreen";
import TorqueScreen from "../screens/calculators/TorqueScreen";
import BenchElectricalScreen from "../screens/calculators/BenchElectricalScreen";

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

const tabBarVisibleStyle = {
  backgroundColor: colors.card,
  borderTopColor: colors.border,
};

function tabBarStyleForRoute(route, homeScreenName) {
  const nested = getFocusedRouteNameFromRoute(route);
  const focused = nested ?? homeScreenName;
  return focused !== homeScreenName ? { display: "none" } : tabBarVisibleStyle;
}

function CalcsStack() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="CalcsHome" component={CalcsHomeScreen} options={{ title: "Calcs" }} />
      <Stack.Screen name="SavedDetail" component={SavedDetailScreen} options={{ title: "Saved" }} />
      <Stack.Screen name="CmBestMatch" component={CmBestMatchScreen} options={{ title: "CM Best Match" }} />
      <Stack.Screen name="PowerCurrent" component={PowerCurrentScreen} options={{ title: "Power & current" }} />
      <Stack.Screen name="SpeedDrives" component={SpeedDrivesScreen} options={{ title: "Speed & drives" }} />
      <Stack.Screen name="Torque" component={TorqueScreen} options={{ title: "Torque" }} />
      <Stack.Screen name="BenchElectrical" component={BenchElectricalScreen} options={{ title: "Bench electrical" }} />
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
        name="Calcs"
        component={CalcsStack}
        options={({ route }) => ({
          tabBarLabel: "Calcs",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "calculator" : "calculator-outline"} size={size ?? 24} color={color} />
          ),
          tabBarStyle: tabBarStyleForRoute(route, "CalcsHome"),
        })}
      />
      <Tab.Screen
        name="Videos"
        component={VideosScreen}
        options={{
          headerShown: true,
          title: "Video lessons",
          headerStyle: { backgroundColor: colors.card },
          headerTitleStyle: { color: colors.title, fontWeight: "700" },
          tabBarLabel: "Videos",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "play-circle" : "play-circle-outline"} size={size ?? 24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerShown: true,
          title: "Profile",
          headerStyle: { backgroundColor: colors.card },
          headerTitleStyle: { color: colors.title, fontWeight: "700" },
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={size ?? 24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
