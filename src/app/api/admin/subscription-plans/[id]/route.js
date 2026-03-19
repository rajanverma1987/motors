import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SubscriptionPlan from "@/models/SubscriptionPlan";
import { getAdminFromRequest } from "@/lib/auth-admin";

export async function PATCH(request, context) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    const body = await request.json().catch(() => ({}));
    const { active } = body;
    await connectDB();
    const plan = await SubscriptionPlan.findById(id);
    if (!plan) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (plan.slug === "free-ultimate" && active === false) {
      return NextResponse.json({ error: "Cannot deactivate Free Ultimate plan." }, { status: 400 });
    }
    if (typeof active === "boolean") {
      plan.active = active;
      await plan.save();
    }
    return NextResponse.json({
      plan: {
        id: String(plan._id),
        active: plan.active,
      },
    });
  } catch (err) {
    console.error("PATCH subscription-plan:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
