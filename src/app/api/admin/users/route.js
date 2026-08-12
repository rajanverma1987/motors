import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import ShopSubscription from "@/models/ShopSubscription";
import SubscriptionPlan from "@/models/SubscriptionPlan";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { parseAdminSortParams, mongoSortFromAdmin, sortAndPaginateAdminRows } from "@/lib/admin-table-sort";
import { hashPassword } from "@/lib/auth-portal";
import { isValidEmail, LIMITS, clampString } from "@/lib/validation";
import {
  assignPaypalPlanToShop,
  assignInternalFreeUltimateToShop,
  assignInternalTrialToShop,
  applyListingOnlySubscriptionToShop,
} from "@/lib/subscription-service";
import { sendDemoAccountCredentialsEmail } from "@/lib/email";

const USER_ADMIN_SORT_KEYS = ["email", "shopName", "contactName", "subscriptionSummary", "canLogin", "createdAt"];
const USER_MONGO_SORT_KEYS = ["email", "shopName", "contactName", "canLogin", "createdAt"];

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
    const qText = String(searchParams.get("q") || "").trim();
    const q = {};
    if (qText) {
      const rx = new RegExp(qText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      q.$or = [{ email: rx }, { shopName: rx }, { contactName: rx }];
    }
    const { sortBy, sortDir } = parseAdminSortParams(searchParams, {
      allowedKeys: USER_ADMIN_SORT_KEYS,
      defaultKey: "createdAt",
      defaultDir: "desc",
    });
    const useMongoSort = USER_MONGO_SORT_KEYS.includes(sortBy);
    const [totalCount, users] = await Promise.all([
      User.countDocuments(q),
      useMongoSort
        ? User.find(q)
            .select("_id email shopName contactName canLogin createdAt")
            .sort(mongoSortFromAdmin(sortBy, sortDir))
            .skip(skip)
            .limit(pageSize)
            .lean()
        : User.find(q)
            .select("_id email shopName contactName canLogin createdAt")
            .sort({ createdAt: -1 })
            .lean(),
    ]);
    const emails = users.map((u) => u.email);
    const subs = await ShopSubscription.find({ ownerEmail: { $in: emails } })
      .populate("planId", "name slug planType")
      .lean();
    const subByEmail = Object.fromEntries(subs.map((s) => [s.ownerEmail, s]));
    let list = users.map((u) => {
      const s = subByEmail[u.email];
      const p = s?.planId;
      return {
        id: String(u._id),
        email: u.email,
        shopName: u.shopName || "",
        contactName: u.contactName || "",
        canLogin: u.canLogin !== false,
        createdAt: u.createdAt,
        subscriptionSummary: s
          ? {
              internalState: s.internalState,
              planName: p?.name || "—",
              planSlug: p?.slug || "",
              planType: p?.planType || "",
              revoked: !!s.revokedAt,
            }
          : null,
      };
    });
    if (!useMongoSort) {
      const paged = sortAndPaginateAdminRows(list, { sortBy, sortDir }, page, pageSize);
      list = paged.items;
      return NextResponse.json({ users: list, page, pageSize, totalCount: paged.totalCount });
    }
    return NextResponse.json({ users: list, page, pageSize, totalCount });
  } catch (err) {
    console.error("Admin users list error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to list users" },
      { status: 500 }
    );
  }
}

/**
 * POST: Create a portal client (optional package assign + demo credentials email).
 */
export async function POST(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const sendEmailFlag = body.sendEmail === true;
    const shopName = clampString(body.shopName ?? "", LIMITS.name.max);
    const contactName = clampString(body.contactName ?? "", LIMITS.name.max);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const packageKind = String(body.packageKind || "").trim() || "trial";
    const planId = body.planId ? String(body.planId) : "";
    const emailSubject = typeof body.emailSubject === "string" ? body.emailSubject : "";
    const emailBodyHtml = typeof body.emailBodyHtml === "string" ? body.emailBodyHtml : "";

    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
    }
    if (password.length < LIMITS.password.min || password.length > LIMITS.password.max) {
      return NextResponse.json(
        {
          error: `Password must be between ${LIMITS.password.min} and ${LIMITS.password.max} characters.`,
        },
        { status: 400 }
      );
    }
    if (packageKind === "paypal" && !planId) {
      return NextResponse.json({ error: "planId required for PayPal package." }, { status: 400 });
    }

    await connectDB();
    const existing = await User.findOne({ email }).select("_id").lean();
    if (existing) {
      return NextResponse.json({ error: "A client with that email already exists." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      email,
      passwordHash,
      shopName,
      contactName,
      canLogin: true,
      listingOnlyAccount: packageKind === "listing_only",
    });

    let planLabel = "";
    let approvalUrl = "";
    try {
      if (packageKind === "trial") {
        await assignInternalTrialToShop(user.email, admin);
        planLabel = "Trial";
      } else if (packageKind === "free_ultimate") {
        await assignInternalFreeUltimateToShop(user.email, admin);
        planLabel = "Free Ultimate";
      } else if (packageKind === "listing_only") {
        await applyListingOnlySubscriptionToShop(user.email);
        planLabel = "Directory listing";
      } else if (packageKind === "paypal") {
        const result = await assignPaypalPlanToShop({
          ownerEmail: user.email,
          planId,
          adminEmail: admin,
          cancelOld: true,
        });
        approvalUrl = result.approvalUrl || "";
        const plan = await SubscriptionPlan.findById(planId).select("name").lean();
        planLabel = plan?.name || "PayPal plan";
      }
    } catch (subErr) {
      console.error("Admin create client package assign:", subErr);
      return NextResponse.json(
        {
          ok: true,
          emailSent: false,
          packageError: subErr.message || "Client created but package assign failed",
          user: {
            id: String(user._id),
            email: user.email,
            shopName: user.shopName || "",
            contactName: user.contactName || "",
          },
        },
        { status: 200 }
      );
    }

    let emailSent = false;
    if (sendEmailFlag) {
      const result = await sendDemoAccountCredentialsEmail({
        to: user.email,
        shopName: user.shopName || "",
        contactName: user.contactName || "",
        userId: String(user._id),
        plainPassword: password,
        planLabel,
        subject: emailSubject,
        bodyHtml: emailBodyHtml,
      });
      if (!result.ok) {
        return NextResponse.json({
          ok: true,
          emailSent: false,
          emailError: result.error || "Failed to send email",
          approvalUrl,
          planLabel,
          user: {
            id: String(user._id),
            email: user.email,
            shopName: user.shopName || "",
            contactName: user.contactName || "",
          },
        });
      }
      emailSent = true;
    }

    return NextResponse.json({
      ok: true,
      emailSent,
      approvalUrl,
      planLabel,
      user: {
        id: String(user._id),
        email: user.email,
        shopName: user.shopName || "",
        contactName: user.contactName || "",
        canLogin: true,
      },
    });
  } catch (err) {
    console.error("Admin users create error:", err);
    return NextResponse.json({ error: err.message || "Failed to create client" }, { status: 500 });
  }
}
