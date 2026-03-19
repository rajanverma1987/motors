import { createNavigationContainerRef } from "@react-navigation/native";

/** Shared ref for navigating from push notification handlers (outside React screens). */
export const navigationRef = createNavigationContainerRef();
