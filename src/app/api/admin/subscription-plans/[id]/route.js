import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SubscriptionPlan from "@/models/SubscriptionPlan";
import ShopSubscription from "@/models/ShopSubscription";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { createPaypalProductAndPlan, paypalConfigured } from "@/lib/paypal-api";

const PROTECTED_SLUGS = new Set(["free-ultimate", "trial"]);

async function getPlanId(context) {
  const params = typeof context.params?.then === "function" ? await context.params : context.params;
  return params?.id;
}

function planJson(plan) {
  return {
    id: String(plan._id),
    name: plan.name,
    slug: plan.slug,
    planType: plan.planType,
    description: plan.description,
    customPrice: plan.customPrice,
    currency: plan.currency,
    billingCycle: plan.billingCycle,
    billingIntervalCount: plan.billingIntervalCount,
    negotiatedBy: plan.negotiatedBy,
    paypalProductId: plan.paypalProductId,
    paypalPlanId: plan.paypalPlanId,
    active: plan.active,
  };
}

export async function PATCH(request, context) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const id = await getPlanId(context);
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    const body = await request.json().catch(() => ({}));
    const { active, customPrice, name, description, negotiatedBy, currency, billingCycle, billingIntervalCount } =
      body;
    await connectDB();
    const plan = await SubscriptionPlan.findById(id);
    if (!plan) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if ((plan.slug === "free-ultimate" || plan.slug === "trial") && active === false) {
      return NextResponse.json({ error: "Cannot deactivate protected internal plan." }, { status: 400 });
    }
    if (typeof active === "boolean") {
      plan.active = active;
    }
    if (typeof name === "string" && name.trim()) {
      plan.name = name.trim();
    }
    if (typeof description === "string") {
      plan.description = description.slice(0, 500);
    }
    if (typeof negotiatedBy === "string") {
      plan.negotiatedBy = negotiatedBy.slice(0, 200);
    }
    if (typeof currency === "string" && currency.trim()) {
      plan.currency = currency.trim().toUpperCase().slice(0, 8);
    }
    if (billingCycle === "monthly" || billingCycle === "yearly" || billingCycle === "custom") {
      plan.billingCycle = billingCycle;
    }
    if (billingIntervalCount !== undefined && billingIntervalCount !== null && billingIntervalCount !== "") {
      plan.billingIntervalCount = Math.max(1, Math.min(24, Number(billingIntervalCount) || 1));
    }

    let priceChanged = false;
    if (customPrice !== undefined && customPrice !== null && customPrice !== "") {
      const nextPrice = Number(customPrice);
      if (!Number.isFinite(nextPrice) || nextPrice < 0) {
        return NextResponse.json({ error: "Enter a valid price." }, { status: 400 });
      }
      priceChanged = Number(plan.customPrice) !== nextPrice;
      plan.customPrice = nextPrice;
    }

    const billingChanged =
      billingCycle !== undefined ||
      (billingIntervalCount !== undefined && billingIntervalCount !== null && billingIntervalCount !== "");

    if (
      (priceChanged || billingChanged) &&
      plan.planType === "paypal" &&
      paypalConfigured() &&
      Number(plan.customPrice) > 0
    ) {
      const { paypalProductId, paypalPlanId } = await createPaypalProductAndPlan(plan);
      plan.paypalProductId = paypalProductId;
      plan.paypalPlanId = paypalPlanId;
    }

    await plan.save();
    return NextResponse.json({ plan: planJson(plan) });
  } catch (err) {
    console.error("PATCH subscription-plan:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const id = await getPlanId(context);
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    await connectDB();
    const plan = await SubscriptionPlan.findById(id);
    if (!plan) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (PROTECTED_SLUGS.has(plan.slug)) {
      return NextResponse.json({ error: `Cannot delete protected plan “${plan.slug}”.` }, { status: 400 });
    }
    const inUse = await ShopSubscription.countDocuments({
      $or: [{ planId: plan._id }, { pendingPlanId: plan._id }],
    });
    if (inUse > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete: ${inUse} shop subscription(s) still use this plan. Deactivate the plan or reassign those shops first.`,
        },
        { status: 400 }
      );
    }
    await SubscriptionPlan.deleteOne({ _id: plan._id });
    return NextResponse.json({ ok: true, deletedId: String(plan._id) });
  } catch (err) {
    console.error("DELETE subscription-plan:", err);
    return NextResponse.json({ error: err.message || "Failed to delete" }, { status: 500 });
  }
}
