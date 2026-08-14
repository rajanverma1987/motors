import * as WebBrowser from "expo-web-browser";
import { appFetch } from "../api";

/**
 * PayPal blocks checkout inside WKWebView. Use Safari / Chrome Custom Tabs instead.
 * Access is granted only after PayPal reports the subscription ACTIVE.
 */
export async function startPaypalCheckout(token) {
  const data = await appFetch("/api/mobile-app/checkout/subscribe", {
    token,
    method: "POST",
    body: {},
  });
  if (!data.approvalUrl) throw new Error("PayPal did not return a checkout link.");

  await WebBrowser.openBrowserAsync(data.approvalUrl, {
    enableBarCollapsing: true,
    showInRecents: true,
  });

  const result = await appFetch("/api/mobile-app/checkout/activate-return", { token, method: "POST" });
  if (!result?.activated) {
    throw new Error("PayPal checkout was not completed. You were not charged.");
  }
  return result;
}
