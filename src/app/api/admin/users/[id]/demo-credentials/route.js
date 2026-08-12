import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import ShopSubscription from "@/models/ShopSubscription";
import SubscriptionPlan from "@/models/SubscriptionPlan";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { hashPassword } from "@/lib/auth-portal";
import { isValidEmail, LIMITS, clampString } from "@/lib/validation";
import {
  assignPaypalPlanToShop,
  assignInternalFreeUltimateToShop,
  assignInternalTrialToShop,
  applyListingOnlySubscriptionToShop,
} from "@/lib/subscription-service";
import {
  buildDemoAccountCredentialsEmailContent,
  sendDemoAccountCredentialsEmail,
} from "@/lib/email";

/**
 * POST: Update client details, set password, assign package, optionally email demo credentials.
 * Body:
 *  - shopName, contactName, email?
 *  - password (required when sendEmail true)
 *  - packageKind: "" | "trial" | "free_ultimate" | "listing_only" | "paypal"
 *  - planId (required for paypal)
 *  - sendEmail: boolean
 *  - emailSubject?, emailBodyHtml? (editable preview overrides)
 *  - previewOnly: boolean — return built email without saving/sending
 */
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
    const previewOnly = body.previewOnly === true;
    const sendEmailFlag = body.sendEmail === true;
    const shopName = clampString(body.shopName ?? "", LIMITS.name.max);
    const contactName = clampString(body.contactName ?? "", LIMITS.name.max);
    const emailRaw = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const packageKind = String(body.packageKind || "").trim();
    const planId = body.planId ? String(body.planId) : "";
    const emailSubject = typeof body.emailSubject === "string" ? body.emailSubject : "";
    const emailBodyHtml = typeof body.emailBodyHtml === "string" ? body.emailBodyHtml : "";

    await connectDB();
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const toEmail = emailRaw || user.email;
    if (!isValidEmail(toEmail)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    let planLabel = "";
    if (packageKind === "trial") planLabel = "Trial";
    else if (packageKind === "free_ultimate") planLabel = "Free Ultimate";
    else if (packageKind === "listing_only") planLabel = "Directory listing";
    else if (packageKind === "paypal" && planId) {
      const plan = await SubscriptionPlan.findById(planId).select("name planType").lean();
      planLabel = plan?.name || "PayPal plan";
    } else if (!packageKind) {
      const sub = await ShopSubscription.findOne({ ownerEmail: user.email })
        .populate("planId", "name")
        .lean();
      planLabel = sub?.planId?.name || "";
    }

    if (previewOnly) {
      if (!password || password.length < LIMITS.password.min) {
        return NextResponse.json(
          { error: `Password required for preview (min ${LIMITS.password.min} characters).` },
          { status: 400 }
        );
      }
      const built = buildDemoAccountCredentialsEmailContent({
        to: toEmail,
        shopName: shopName || user.shopName || "",
        contactName: contactName || user.contactName || "",
        userId: String(user._id),
        plainPassword: password,
        planLabel,
      });
      return NextResponse.json({
        ok: true,
        email: {
          subject: emailSubject.trim() || built.subject,
          bodyHtml: emailBodyHtml.trim() || built.bodyHtml,
          defaultSubject: built.subject,
          defaultBodyHtml: built.bodyHtml,
        },
      });
    }

    if (sendEmailFlag) {
      if (password.length < LIMITS.password.min || password.length > LIMITS.password.max) {
        return NextResponse.json(
          {
            error: `Password must be between ${LIMITS.password.min} and ${LIMITS.password.max} characters to send credentials.`,
          },
          { status: 400 }
        );
      }
    } else if (password) {
      if (password.length < LIMITS.password.min || password.length > LIMITS.password.max) {
        return NextResponse.json(
          {
            error: `Password must be between ${LIMITS.password.min} and ${LIMITS.password.max} characters.`,
          },
          { status: 400 }
        );
      }
    }

    const oldEmail = user.email;
    if (emailRaw && emailRaw !== oldEmail) {
      const taken = await User.findOne({ email: emailRaw, _id: { $ne: user._id } }).select("_id").lean();
      if (taken) {
        return NextResponse.json({ error: "Another account already uses that email." }, { status: 409 });
      }
      user.email = emailRaw;
      await ShopSubscription.updateMany({ ownerEmail: oldEmail }, { $set: { ownerEmail: emailRaw } });
    }
    if (shopName !== undefined) user.shopName = shopName;
    if (contactName !== undefined) user.contactName = contactName;
    if (password) {
      user.passwordHash = await hashPassword(password);
    }
    user.canLogin = true;
    await user.save();

    let approvalUrl = "";
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
      if (!planId) {
        return NextResponse.json({ error: "planId required for PayPal package." }, { status: 400 });
      }
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
        return NextResponse.json(
          {
            ok: true,
            emailSent: false,
            emailError: result.error || "Failed to send email",
            user: {
              id: String(user._id),
              email: user.email,
              shopName: user.shopName || "",
              contactName: user.contactName || "",
            },
            approvalUrl,
            planLabel,
          },
          { status: 200 }
        );
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
        canLogin: user.canLogin !== false,
      },
    });
  } catch (err) {
    console.error("Admin demo-credentials error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
