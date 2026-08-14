import * as WebBrowser from "expo-web-browser";
import { appFetch } from "../api";

/**
 * PayPal blocks checkout inside WKWebView. Use Safari / Chrome Custom Tabs instead.
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

  try {
    await appFetch("/api/mobile-app/checkout/activate-return", { token, method: "POST" });
  } catch {
    /* webhook may still activate */
  }
}
