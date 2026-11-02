import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Tenant from "@/models/Tenant";
import ShopSubscription from "@/models/ShopSubscription";
import { getAdminSessionFromRequest } from "@/lib/auth-admin";
import { adminCan } from "@/lib/admin-rbac";
import {
  assignPaypalPlanToShop,
  assignInternalFreeUltimateToShop,
  assignInternalTrialToShop,
  revokeShopAccess,
  clearShopRevoke,
  logSubscriptionTransaction,
} from "@/lib/subscription-service";

async function loadTenant(slug) {
  await dbConnect();
  return Tenant.findOne({ slug }).lean();
}

function serializeSub(sub) {
  if (!sub) return null;
  const plan = sub.planId && typeof sub.planId === "object" ? sub.planId : null;
  return {
    id: String(sub._id),
    internalState: sub.internalState,
    revokedAt: sub.revokedAt || null,
    revokedReason: sub.revokedReason || "",
    paypalSubscriptionId: sub.paypalSubscriptionId || "",
    pendingApprovalUrl: sub.pendingApprovalUrl || "",
    nextBillingTime: sub.nextBillingTime || null,
    gracePeriodEndsAt: sub.gracePeriodEndsAt || null,
    paymentFailureCount: sub.paymentFailureCount || 0,
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
  };
}

export async function GET(request, context) {
  try {
    const session = await getAdminSessionFromRequest(request);
    if (!session?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!adminCan(session.role, "tenants.read") && !adminCan(session.role, "tenants.subscription")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const slug = String(params?.slug || "").trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

    const tenant = await loadTenant(slug);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const email = String(tenant.ownerEmail || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({
        tenant: { slug: tenant.slug, ownerEmail: "", companyName: tenant.companyName || "" },
        subscription: null,
        warning: "Tenant has no ownerEmail. Set owner email before assigning a plan.",
      });
    }

    const sub = await ShopSubscription.findOne({ ownerEmail: email }).populate("planId").lean();
    return NextResponse.json({
      tenant: {
        slug: tenant.slug,
        ownerEmail: email,
        companyName: tenant.companyName || "",
        host: tenant.host || "",
      },
      subscription: serializeSub(sub),
    });
  } catch (err) {
    console.error("GET tenant subscription:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request, context) {
  try {
    const session = await getAdminSessionFromRequest(request);
    if (!session?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!adminCan(session.role, "tenants.subscription")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const slug = String(params?.slug || "").trim().toLowerCase();
    if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

    const tenant = await loadTenant(slug);
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    const email = String(tenant.ownerEmail || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json(
        { error: "Tenant has no ownerEmail. Set owner email before assigning a plan." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { action, planId, reason, cancelOldPaypal, days } = body;
    const admin = session.email;

    if (action === "assign_paypal") {
      if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 });
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
        subscription: serializeSub(
          await ShopSubscription.findOne({ ownerEmail: email }).populate("planId").lean()
        ),
      });
    }

    if (action === "assign_free_ultimate") {
      await assignInternalFreeUltimateToShop(email, admin);
      return NextResponse.json({
        ok: true,
        subscription: serializeSub(
          await ShopSubscription.findOne({ ownerEmail: email }).populate("planId").lean()
        ),
      });
    }

    if (action === "assign_trial") {
      await assignInternalTrialToShop(email, admin);
      return NextResponse.json({
        ok: true,
        subscription: serializeSub(
          await ShopSubscription.findOne({ ownerEmail: email }).populate("planId").lean()
        ),
      });
    }

    if (action === "revoke") {
      if (!reason || !String(reason).trim()) {
        return NextResponse.json({ error: "reason required" }, { status: 400 });
      }
      await revokeShopAccess(email, String(reason).trim(), admin);
      return NextResponse.json({
        ok: true,
        subscription: serializeSub(
          await ShopSubscription.findOne({ ownerEmail: email }).populate("planId").lean()
        ),
      });
    }

    if (action === "clear_revoke") {
      await clearShopRevoke(email, admin);
      return NextResponse.json({
        ok: true,
        subscription: serializeSub(
          await ShopSubscription.findOne({ ownerEmail: email }).populate("planId").lean()
        ),
      });
    }

    if (action === "extend_grace") {
      const sub = await ShopSubscription.findOne({ ownerEmail: email });
      if (!sub) return NextResponse.json({ error: "No subscription" }, { status: 404 });
      const n = Math.min(30, Math.max(1, Number(days) || 7));
      const base =
        sub.gracePeriodEndsAt && new Date(sub.gracePeriodEndsAt) > new Date()
          ? new Date(sub.gracePeriodEndsAt)
          : new Date();
      base.setDate(base.getDate() + n);
      sub.gracePeriodEndsAt = base;
      await sub.save();
      await logSubscriptionTransaction({
        ownerEmail: email,
        type: "admin_override",
        description: `Extended grace by ${n} day(s)`,
        performedBy: admin,
        status: "ok",
      });
      return NextResponse.json({
        ok: true,
        gracePeriodEndsAt: sub.gracePeriodEndsAt,
        subscription: serializeSub(
          await ShopSubscription.findOne({ ownerEmail: email }).populate("planId").lean()
        ),
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("POST tenant subscription:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
