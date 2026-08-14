import * as WebBrowser from "expo-web-browser";
import { appFetch } from "../api";

const RETURN_URL = "https://iqmotorbase.com/mobile-app/paypal-complete";

/**
 * Open PayPal in an in-app browser sheet (Safari View / Chrome Custom Tabs).
 * Does not switch to the standalone Safari or Chrome app.
 */
export async function startPaypalCheckout(token) {
  const data = await appFetch("/api/mobile-app/checkout/subscribe", {
    token,
    method: "POST",
    body: {},
  });
  if (!data.approvalUrl) throw new Error("PayPal did not return a checkout link.");

  await WebBrowser.openAuthSessionAsync(data.approvalUrl, RETURN_URL, {
    preferEphemeralSession: false,
    showInRecents: false,
  });

  const result = await appFetch("/api/mobile-app/checkout/activate-return", { token, method: "POST" });
  if (!result?.activated) {
    throw new Error("PayPal checkout was not completed. You were not charged.");
  }
  return result;
}
