import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { techFetch } from "./api";
import { navigationRef } from "./navigationRef";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function navigateToWorkOrderIfPossible(workOrderId) {
  const id = workOrderId ? String(workOrderId).trim() : "";
  if (!id) return;
  const go = () => {
    if (navigationRef.isReady()) {
      navigationRef.navigate("MainTabs", {
        screen: "Jobs",
        params: {
          screen: "WorkOrderDetail",
          params: { id },
        },
      });
    }
  };
  go();
  requestAnimationFrame(go);
  setTimeout(go, 400);
}

/**
 * Call when user is logged in: permissions + Expo token + POST /api/tech/push/register
 * @param {string} authToken JWT
 */
export async function registerExpoPushForTechnician(authToken) {
  if (!authToken) return { skipped: true, reason: "no_token" };
  if (!Device.isDevice) {
    return { skipped: true, reason: "simulator" };
  }

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      return { skipped: true, reason: "permission_denied" };
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Work orders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#1e5a8a",
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenRes = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const expoPushToken = tokenRes?.data;
    if (!expoPushToken) {
      return { skipped: true, reason: "no_expo_token" };
    }

    await techFetch("/api/tech/push/register", {
      token: authToken,
      method: "POST",
      body: { expoPushToken },
    });
    return { ok: true };
  } catch (e) {
    console.warn("Push registration failed:", e?.message || e);
    return { skipped: true, reason: "error", error: e?.message };
  }
}

/**
 * @param {import('expo-notifications').NotificationResponse | null} response
 */
export function openWorkOrderFromNotificationResponse(response) {
  const data = response?.notification?.request?.content?.data;
  if (data?.type === "work_order_assigned" && data.workOrderId) {
    navigateToWorkOrderIfPossible(data.workOrderId);
  }
}

/**
 * Subscribe to notification opens + handle cold start (logged-in only).
 * @param {boolean} isLoggedIn
 */
export function subscribeWorkOrderNotificationNavigation(isLoggedIn) {
  if (!isLoggedIn) {
    return () => {};
  }

  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    openWorkOrderFromNotificationResponse(response);
  });

  let cancelled = false;
  (async () => {
    try {
      const last = await Notifications.getLastNotificationResponseAsync();
      if (cancelled || !last) return;
      openWorkOrderFromNotificationResponse(last);
    } catch {
      /* ignore */
    }
  })();

  return () => {
    cancelled = true;
    sub.remove();
  };
}
