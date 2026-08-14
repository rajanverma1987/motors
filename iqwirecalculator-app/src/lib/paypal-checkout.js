import { AppState, Linking } from "react-native";
import { appFetch } from "../api";

function waitForReturnToApp() {
  return new Promise((resolve) => {
    let leftApp = AppState.currentState !== "active";
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active") {
        leftApp = true;
        return;
      }
      if (leftApp) {
        sub.remove();
        resolve();
      }
    });
  });
}

/**
 * Open PayPal in the device browser (Safari / Chrome). In-app browsers hit PayPal’s
 * “Things don’t appear to be working” page even when the billing plan is ON.
 */
export async function startPaypalCheckout(token) {
  const data = await appFetch("/api/mobile-app/checkout/subscribe", {
    token,
    method: "POST",
    body: {},
  });
  if (!data.approvalUrl) throw new Error("PayPal did not return a checkout link.");

  const canOpen = await Linking.canOpenURL(data.approvalUrl);
  if (!canOpen) throw new Error("Cannot open PayPal on this device.");

  const returned = waitForReturnToApp();
  await Linking.openURL(data.approvalUrl);
  await returned;

  const result = await appFetch("/api/mobile-app/checkout/activate-return", { token, method: "POST" });
  if (!result?.activated) {
    throw new Error("PayPal checkout was not completed. You were not charged.");
  }
  return result;
}
