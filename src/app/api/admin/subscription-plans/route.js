import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SubscriptionPlan from "@/models/SubscriptionPlan";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { createPaypalBackedPlan } from "@/lib/subscription-service";
import { parseAdminSortParams, mongoSortFromAdmin } from "@/lib/admin-table-sort";

const SUBSCRIPTION_PLAN_SORT_KEYS = ["name", "slug", "planType", "customPrice", "negotiatedBy", "active", "createdAt"];

export async function GET(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 25));
    const skip = (page - 1) * pageSize;
    const { sortBy, sortDir } = parseAdminSortParams(searchParams, {
      allowedKeys: SUBSCRIPTION_PLAN_SORT_KEYS,
      defaultKey: "createdAt",
      defaultDir: "desc",
    });
    const [totalCount, plans] = await Promise.all([
      SubscriptionPlan.countDocuments({}),
      SubscriptionPlan.find({})
        .sort(mongoSortFromAdmin(sortBy, sortDir))
        .skip(skip)
        .limit(pageSize)
        .lean(),
    ]);
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
      page,
      pageSize,
      totalCount,
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
