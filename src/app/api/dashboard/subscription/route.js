import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ShopSubscription from "@/models/ShopSubscription";
import SubscriptionTransaction from "@/models/SubscriptionTransaction";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { computeSubscriptionPortalAccess } from "@/lib/subscription-access";
import { ensureShopSubscriptionOnRegister } from "@/lib/subscription-service";

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = user.email.trim().toLowerCase();
    await connectDB();
    await ensureShopSubscriptionOnRegister(email).catch(() => {});

    const access = await computeSubscriptionPortalAccess(email);
    const sub = await ShopSubscription.findOne({ ownerEmail: email }).populate("planId").lean();
    const recent = await SubscriptionTransaction.find({ ownerEmail: email })
      .sort({ createdAt: -1 })
      .limit(25)
      .lean();

    const plan = sub?.planId;
    return NextResponse.json({
      accessAllowed: access.allowed,
      accessReason: access.reason,
      subscription: sub
        ? {
            internalState: sub.internalState,
            nextBillingTime: sub.nextBillingTime,
            gracePeriodEndsAt: sub.gracePeriodEndsAt,
            paymentFailureCount: sub.paymentFailureCount,
            pendingApprovalUrl: sub.pendingApprovalUrl,
            hasPaypalSubscription: !!(sub.paypalSubscriptionId && String(sub.paypalSubscriptionId).trim()),
            plan: plan
              ? {
                  name: plan.name,
                  slug: plan.slug,
                  planType: plan.planType,
                  customPrice: plan.customPrice,
                  billingCycle: plan.billingCycle,
                  currency: plan.currency,
                }
              : null,
            customPriceSnapshot: sub.customPriceSnapshot,
            currencySnapshot: sub.currencySnapshot,
          }
        : null,
      transactions: recent.map((t) => ({
        id: String(t._id),
        type: t.type,
        amount: t.amount,
        currency: t.currency,
        status: t.status,
        description: t.description,
        createdAt: t.createdAt,
      })),
    });
  } catch (err) {
    console.error("GET dashboard subscription:", err);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
