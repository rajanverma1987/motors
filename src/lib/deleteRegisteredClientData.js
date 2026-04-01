import AreaNotifyRequest from "@/models/AreaNotifyRequest";
import Customer from "@/models/Customer";
import Employee from "@/models/Employee";
import IntegrationApiKey from "@/models/IntegrationApiKey";
import IntegrationWebhook from "@/models/IntegrationWebhook";
import IntegrationWebhookDelivery from "@/models/IntegrationWebhookDelivery";
import InventoryItem from "@/models/InventoryItem";
import InventoryReservation from "@/models/InventoryReservation";
import Invoice from "@/models/Invoice";
import JobApplication from "@/models/JobApplication";
import JobPosting from "@/models/JobPosting";
import Lead from "@/models/Lead";
import Listing from "@/models/Listing";
import LogisticsEntry from "@/models/LogisticsEntry";
import MarketingContact from "@/models/MarketingContact";
import MarketplaceItem from "@/models/MarketplaceItem";
import MarketplaceOrder from "@/models/MarketplaceOrder";
import Motor from "@/models/Motor";
import Policy from "@/models/Policy";
import PurchaseOrder from "@/models/PurchaseOrder";
import Quote from "@/models/Quote";
import Review from "@/models/Review";
import SalesCommission from "@/models/SalesCommission";
import SalesPerson from "@/models/SalesPerson";
import ShopSubscription from "@/models/ShopSubscription";
import SubscriptionTransaction from "@/models/SubscriptionTransaction";
import SupportTicket from "@/models/SupportTicket";
import UserSettings from "@/models/UserSettings";
import Vendor from "@/models/Vendor";
import VerificationCode from "@/models/VerificationCode";
import WireSize from "@/models/WireSize";
import WorkOrder from "@/models/WorkOrder";

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Cancels active PayPal billing subscriptions for a shop (best effort), then removes DB rows.
 * Ignores PayPal errors (e.g. already cancelled) so the account purge can still complete.
 */
async function cancelPaypalSubscriptionsForShopEmail(email) {
  try {
    const sub = await ShopSubscription.findOne({ ownerEmail: email })
      .select("paypalSubscriptionId previousPaypalSubscriptionId")
      .lean();
    if (!sub) return;
    const ids = [...new Set([sub.paypalSubscriptionId, sub.previousPaypalSubscriptionId].filter(Boolean))];
    if (ids.length === 0) return;
    const { cancelPaypalSubscription } = await import("@/lib/paypal-api");
    for (const id of ids) {
      try {
        await cancelPaypalSubscription(id, "Shop account removed by admin");
      } catch (e) {
        console.warn(`PayPal cancel for subscription ${id}:`, e?.message || e);
      }
    }
  } catch (e) {
    console.warn("PayPal cancel before shop delete:", e?.message || e);
  }
}

/**
 * Removes all MongoDB data tied to a registered portal user (shop), identified by
 * their login email and User _id. Deletes directory listings (and their reviews),
 * CRM entities, inventory, subscriptions, integrations, and related records.
 * Attempts to cancel PayPal subscriptions first when credentials are configured.
 *
 * @param {{ _id: object, email: string }} user — Mongo User document with `_id` and `email`
 */
export async function deleteAllDataForRegisteredClient(user) {
  const email = (user.email || "").toLowerCase().trim();
  if (!email) throw new Error("User email is required for purge");
  const userId = user._id;
  const emailMatch = new RegExp("^" + escapeRegex(email) + "$", "i");
  const ownerQ = { ownerEmail: email };
  const shopQ = { createdByEmail: emailMatch };

  await cancelPaypalSubscriptionsForShopEmail(email);

  const listingOr = [{ email: emailMatch }, { crmUserId: userId }];
  const listingDocs = await Listing.find({ $or: listingOr }).select("_id urlSlug").lean();
  const listingIds = listingDocs.map((d) => d._id);
  const listingIdStrs = listingIds.map((id) => id.toString());
  const listingSlugs = listingDocs.map((d) => (d.urlSlug || "").trim()).filter(Boolean);

  if (listingIds.length) {
    await Review.deleteMany({ listingId: { $in: listingIds } });
  }
  /** Website RFQs reference listing ids but often have no createdByEmail — remove before listings. */
  if (listingIdStrs.length) {
    await Lead.deleteMany({
      $or: [
        { sourceListingId: { $in: listingIdStrs } },
        { assignedListingIds: { $in: listingIdStrs } },
      ],
    });
  }
  await Listing.deleteMany({ $or: listingOr });

  try {
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/electric-motor-reapir-shops-listings");
    revalidatePath("/sitemap.xml");
    for (const slug of listingSlugs) {
      revalidatePath(`/electric-motor-reapir-shops-listings/${slug}`);
    }
  } catch (e) {
    console.warn("revalidatePath after listing purge:", e?.message || e);
  }

  await Promise.all([
    Vendor.deleteMany(shopQ),
    WorkOrder.deleteMany(shopQ),
    SupportTicket.deleteMany(shopQ),
    Quote.deleteMany(shopQ),
    Employee.deleteMany(shopQ),
    Policy.deleteMany(shopQ),
    SalesCommission.deleteMany(shopQ),
    InventoryReservation.deleteMany(shopQ),
    WireSize.deleteMany(shopQ),
    InventoryItem.deleteMany(shopQ),
    Motor.deleteMany(shopQ),
    MarketplaceItem.deleteMany(shopQ),
    LogisticsEntry.deleteMany(shopQ),
    Invoice.deleteMany(shopQ),
    Lead.deleteMany(shopQ),
    SalesPerson.deleteMany(shopQ),
    PurchaseOrder.deleteMany(shopQ),
    Customer.deleteMany(shopQ),
    ShopSubscription.deleteMany(ownerQ),
    UserSettings.deleteMany(ownerQ),
    IntegrationWebhook.deleteMany(ownerQ),
    IntegrationWebhookDelivery.deleteMany(ownerQ),
    IntegrationApiKey.deleteMany(ownerQ),
    SubscriptionTransaction.deleteMany(ownerQ),
    JobApplication.deleteMany(ownerQ),
    JobPosting.deleteMany(ownerQ),
    MarketplaceOrder.deleteMany({ shopOwnerEmail: email }),
    VerificationCode.deleteMany({ email }),
    MarketingContact.deleteMany({ email }),
    AreaNotifyRequest.deleteMany({ email }),
  ]);
}
