import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import ShopSubscription from "@/models/ShopSubscription";
import { getAdminFromRequest } from "@/lib/auth-admin";
import {
  assignPaypalPlanToShop,
  assignInternalFreeUltimateToShop,
  revokeShopAccess,
  clearShopRevoke,
  ensureShopSubscriptionOnRegister,
  logSubscriptionTransaction,
} from "@/lib/subscription-service";

export async function GET(request, context) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }
    await connectDB();
    const user = await User.findById(id).select("email").lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    let sub = await ShopSubscription.findOne({ ownerEmail: user.email })
      .populate("planId")
      .lean();
    if (!sub) {
      await ensureShopSubscriptionOnRegister(user.email);
      sub = await ShopSubscription.findOne({ ownerEmail: user.email })
        .populate("planId")
        .lean();
    }
    const plan = sub?.planId;
    return NextResponse.json({
      subscription: sub
        ? {
            id: String(sub._id),
            internalState: sub.internalState,
            revokedAt: sub.revokedAt,
            revokedReason: sub.revokedReason,
            paypalSubscriptionId: sub.paypalSubscriptionId,
            pendingApprovalUrl: sub.pendingApprovalUrl,
            nextBillingTime: sub.nextBillingTime,
            gracePeriodEndsAt: sub.gracePeriodEndsAt,
            paymentFailureCount: sub.paymentFailureCount,
            customPriceSnapshot: sub.customPriceSnapshot,
            currencySnapshot: sub.currencySnapshot,
            plan: plan
              ? {
                  id: String(plan._id),
                  name: plan.name,
                  slug: plan.slug,
                  planType: plan.planType,
                  customPrice: plan.customPrice,
                  billingCycle: plan.billingCycle,
                }
              : null,
          }
        : null,
    });
  } catch (err) {
    console.error("GET user subscription:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request, context) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }
    const body = await request.json().catch(() => ({}));
    const { action, planId, reason, cancelOldPaypal } = body;

    await connectDB();
    const user = await User.findById(id).select("email").lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const email = user.email;

    if (action === "assign_paypal") {
      if (!planId) {
        return NextResponse.json({ error: "planId required" }, { status: 400 });
      }
      const result = await assignPaypalPlanToShop({
        ownerEmail: email,
        planId,
        adminEmail: admin,
        cancelOld: cancelOldPaypal !== false,
      });
      return NextResponse.json({
        ok: true,
        approvalUrl: result.approvalUrl,
        paypalSubscriptionId: result.subscription.paypalSubscriptionId,
      });
    }

    if (action === "assign_free_ultimate") {
      await assignInternalFreeUltimateToShop(email, admin);
      return NextResponse.json({ ok: true });
    }

    if (action === "revoke") {
      if (!reason || !String(reason).trim()) {
        return NextResponse.json({ error: "reason required" }, { status: 400 });
      }
      await revokeShopAccess(email, String(reason).trim(), admin);
      return NextResponse.json({ ok: true });
    }

    if (action === "clear_revoke") {
      await clearShopRevoke(email, admin);
      return NextResponse.json({ ok: true });
    }

    if (action === "extend_grace") {
      const sub = await ShopSubscription.findOne({ ownerEmail: email });
      if (!sub) {
        return NextResponse.json({ error: "No subscription" }, { status: 404 });
      }
      const days = Math.min(30, Math.max(1, Number(body.days) || 7));
      const base = sub.gracePeriodEndsAt && new Date(sub.gracePeriodEndsAt) > new Date()
        ? new Date(sub.gracePeriodEndsAt)
        : new Date();
      base.setDate(base.getDate() + days);
      sub.gracePeriodEndsAt = base;
      await sub.save();
      return NextResponse.json({ ok: true, gracePeriodEndsAt: sub.gracePeriodEndsAt });
    }

    if (action === "mark_paid_offline") {
      const { amount, note } = body;
      const sub = await ShopSubscription.findOne({ ownerEmail: email });
      if (!sub) {
        return NextResponse.json({ error: "No subscription" }, { status: 404 });
      }
      sub.internalState = "active";
      sub.paymentFailureCount = 0;
      sub.gracePeriodEndsAt = undefined;
      await sub.save();
      await logSubscriptionTransaction({
        ownerEmail: email,
        type: "offline_marked_paid",
        amount: amount != null ? Number(amount) : undefined,
        status: "recorded",
        description: String(note || "Marked paid offline").slice(0, 500),
        performedBy: admin,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "override_price_note") {
      const { customPriceSnapshot, notes } = body;
      const sub = await ShopSubscription.findOne({ ownerEmail: email });
      if (!sub) {
        return NextResponse.json({ error: "No subscription" }, { status: 404 });
      }
      if (customPriceSnapshot != null) {
        sub.customPriceSnapshot = Number(customPriceSnapshot);
      }
      if (notes != null) {
        sub.notes = String(notes).slice(0, 2000);
      }
      await sub.save();
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("POST user subscription:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 400 });
  }
}
