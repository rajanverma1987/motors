import { Platform } from "react-native";
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  finishTransaction,
  getAvailablePurchases,
  restorePurchases,
  deepLinkToSubscriptions,
  purchaseUpdatedListener,
  purchaseErrorListener,
  ErrorCode,
} from "expo-iap";
import { appFetch } from "../api";

export const IAP_PRODUCT_ID = "IQWireMonthly";
export const IAP_ANDROID_PACKAGE = "com.iqwirecalculator.iqmotorbase.com";

function isCancelled(error) {
  const code = String(error?.code || "");
  return code === ErrorCode.UserCancelled || code === "user-cancelled" || /cancel/i.test(String(error?.message || ""));
}

const FALLBACK_PRICE = "$11.99 / month";

let connecting = null;
let connected = false;

export async function initSubscriptionStore() {
  if (connected) return true;
  if (connecting) return connecting;
  connecting = initConnection()
    .then(() => {
      connected = true;
      return true;
    })
    .catch((err) => {
      connected = false;
      const error = new Error("Unable to connect to the App Store/Google Play. Please try again.");
      error.cause = err;
      throw error;
    })
    .finally(() => {
      connecting = null;
    });
  return connecting;
}

export async function endSubscriptionStore() {
  connected = false;
  connecting = null;
  try {
    await endConnection();
  } catch {
    /* ignore */
  }
}

function androidOfferToken(offer) {
  return String(offer?.offerTokenAndroid || offer?.offerToken || "").trim();
}

function androidOffers(product) {
  const offers = Array.isArray(product?.subscriptionOffers) ? product.subscriptionOffers : [];
  const withToken = offers.filter((offer) => androidOfferToken(offer));
  if (!withToken.length) return undefined;
  const trial = withToken.find((offer) => String(offer.paymentMode || "").toLowerCase().includes("free"));
  const chosen = trial || withToken[0];
  return [{ sku: IAP_PRODUCT_ID, offerToken: androidOfferToken(chosen) }];
}

function hasIntroOffer(product) {
  if (!product) return false;
  if (product.introductoryPriceIOS) return true;
  const offers = Array.isArray(product.subscriptionOffers) ? product.subscriptionOffers : [];
  return offers.some((offer) => String(offer.paymentMode || "").toLowerCase().includes("free"));
}

export async function loadMonthlyProduct() {
  await initSubscriptionStore();
  const products = await fetchProducts({ skus: [IAP_PRODUCT_ID], type: "subs" });
  const list = Array.isArray(products) ? products : [];
  const product = list.find((item) => item.id === IAP_PRODUCT_ID || item.productId === IAP_PRODUCT_ID) || list[0];
  if (!product) {
    throw new Error("Subscription is temporarily unavailable.");
  }
  return {
    product,
    displayPrice: product.displayPrice ? `${product.displayPrice} / month` : FALLBACK_PRICE,
    hasIntroOffer: hasIntroOffer(product),
  };
}

function purchaseTokenFrom(purchase) {
  return String(
    purchase?.purchaseToken ||
      purchase?.purchaseTokenAndroid ||
      purchase?.jwsRepresentationIos ||
      purchase?.transactionReceipt ||
      ""
  ).trim();
}

async function verifyPurchaseOnServer(token, purchase) {
  const purchaseToken = purchaseTokenFrom(purchase);
  if (!purchaseToken) {
    throw new Error("We couldn't verify your subscription. Please try again.");
  }
  const data = await appFetch("/api/mobile-app/iap/verify", {
    token,
    method: "POST",
    body: {
      platform: Platform.OS === "ios" ? "ios" : "android",
      productId: IAP_PRODUCT_ID,
      purchaseToken,
      transactionId: purchase.id || purchase.transactionId || "",
    },
  });
  if (!data?.activated && !data?.account?.unlocked) {
    throw new Error("We couldn't verify your subscription. Please try again.");
  }
  return data;
}

function waitForPurchaseResult() {
  let settled = false;
  let updated;
  let failed;
  let abort = () => {};
  const promise = new Promise((resolve, reject) => {
    const finish = (fn) => (payload) => {
      if (settled) return;
      settled = true;
      updated?.remove();
      failed?.remove();
      fn(payload);
    };
    abort = () => finish(() => resolve({ aborted: true }))();
    updated = purchaseUpdatedListener(finish((purchase) => resolve({ purchase })), {
      dedupeTransactionIOS: true,
    });
    failed = purchaseErrorListener(
      finish((error) => {
        if (isCancelled(error) || error?.code === ErrorCode.UserCancelled) {
          resolve({ cancelled: true });
          return;
        }
        reject(error);
      })
    );
    setTimeout(() => {
      finish((error) => reject(error))(
        new Error("Unable to connect to the App Store/Google Play. Please try again.")
      );
    }, 120000);
  });
  return { promise, abort };
}

export async function purchaseMonthlySubscription(authToken) {
  const { product } = await loadMonthlyProduct();
  const pending = waitForPurchaseResult();
  try {
    await requestPurchase({
      type: "subs",
      request: {
        apple: { sku: IAP_PRODUCT_ID },
        google: {
          skus: [IAP_PRODUCT_ID],
          subscriptionOffers: androidOffers(product),
        },
      },
    });
  } catch (err) {
    pending.abort();
    if (isCancelled(err) || err?.code === ErrorCode.UserCancelled) {
      return { cancelled: true };
    }
    throw err;
  }

  const result = await pending.promise;
  if (result.cancelled) return { cancelled: true };

  const purchase = result.purchase;
  if (!purchase) throw new Error("Subscription is temporarily unavailable.");
  if (purchase.purchaseState === "pending") {
    return { pending: true };
  }

  await verifyPurchaseOnServer(authToken, purchase);
  try {
    await finishTransaction({ purchase, isConsumable: false });
  } catch {
    /* Android acknowledge can race; entitlement is already server-side. */
  }
  return { ok: true };
}

export async function restoreMonthlySubscription(authToken) {
  await initSubscriptionStore();
  try {
    await restorePurchases();
  } catch {
    /* Android restore is query-only. */
  }
  const purchases = await getAvailablePurchases();
  const list = Array.isArray(purchases) ? purchases : [];
  const mine = list.filter((item) => item.productId === IAP_PRODUCT_ID || item.id === IAP_PRODUCT_ID);
  if (!mine.length) {
    return { restored: false };
  }
  let lastError = null;
  for (const purchase of mine) {
    try {
      await verifyPurchaseOnServer(authToken, purchase);
      await finishTransaction({ purchase, isConsumable: false }).catch(() => {});
      return { restored: true };
    } catch (err) {
      lastError = err;
    }
  }
  if (lastError) throw lastError;
  return { restored: false };
}

export async function openSubscriptionManagement() {
  await deepLinkToSubscriptions({
    skuAndroid: IAP_PRODUCT_ID,
    packageNameAndroid: IAP_ANDROID_PACKAGE,
  });
}

export function friendlyIapError(err) {
  if (!err) return "Please try again.";
  if (isCancelled(err) || err.code === ErrorCode.UserCancelled) return "";
  const msg = String(err.message || "");
  if (/pending/i.test(msg)) return "Your purchase is pending.";
  if (/verify|verification|credential/i.test(msg)) {
    return "We couldn't verify your subscription. Please try again.";
  }
  if (/unavailable|not found|sku/i.test(msg)) return "Subscription is temporarily unavailable.";
  if (/connect|store|play|prepared|network/i.test(msg)) {
    return "Unable to connect to the App Store/Google Play. Please try again.";
  }
  return msg || "Please try again.";
}
