import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SubscriptionPlan from "@/models/SubscriptionPlan";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { createPaypalBackedPlan } from "@/lib/subscription-service";

export async function GET(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const plans = await SubscriptionPlan.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json({
      plans: plans.map((p) => ({
        id: String(p._id),
        name: p.name,
        slug: p.slug,
        planType: p.planType,
        description: p.description,
        customPrice: p.customPrice,
        currency: p.currency,
        billingCycle: p.billingCycle,
        billingIntervalCount: p.billingIntervalCount,
        negotiatedBy: p.negotiatedBy,
        paypalProductId: p.paypalProductId,
        paypalPlanId: p.paypalPlanId,
        active: p.active,
        createdAt: p.createdAt,
      })),
    });
  } catch (err) {
    console.error("GET subscription-plans:", err);
    return NextResponse.json({ error: "Failed to list plans" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const plan = await createPaypalBackedPlan(body, admin);
    return NextResponse.json({
      plan: {
        id: String(plan._id),
        name: plan.name,
        slug: plan.slug,
        planType: plan.planType,
        paypalPlanId: plan.paypalPlanId,
        paypalProductId: plan.paypalProductId,
        customPrice: plan.customPrice,
      },
    });
  } catch (err) {
    console.error("POST subscription-plans:", err);
    return NextResponse.json({ error: err.message || "Failed to create plan" }, { status: 400 });
  }
}
