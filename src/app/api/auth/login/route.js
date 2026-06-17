import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Employee from "@/models/Employee";
import { verifyPassword, createPortalToken, setPortalSessionCookies } from "@/lib/auth-portal";
import { checkRateLimit } from "@/lib/rate-limit";
import { getLoginBlockReason } from "@/lib/subscription-access";
import { syncSubscriptionWithAccountTier } from "@/lib/subscription-service";
import { userIsListingOnlyAccount } from "@/lib/listing-account-restrictions";
import { userIsCalculatorOnlyPortalAccount } from "@/lib/calculator-portal-tier";
import { recordPortalLogin } from "@/lib/portal-login-audit";

export async function POST(request) {
  const { allowed } = checkRateLimit(request, "portal-login", 10);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  try {
    const body = await request.json();
    const { email, password } = body || {};
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    await connectDB();
    const emailRaw = email.trim().toLowerCase();
    let ownerUser = await User.findOne({ email: emailRaw });
    let actingEmployee = null;
    let ownerEmail = emailRaw;

    if (ownerUser) {
      const valid = await verifyPassword(password, ownerUser.passwordHash);
      if (!valid) {
        ownerUser = null;
      }
    }

    if (!ownerUser) {
      const employeeCandidates = await Employee.find({ email: emailRaw }).select("+passwordHash").lean();
      for (const emp of employeeCandidates) {
        if (!emp?.canLogin) continue;
        if (!emp?.passwordHash) continue;
        const ok = await verifyPassword(password, emp.passwordHash);
        if (!ok) continue;
        const empOwnerEmail = String(emp.createdByEmail || "").trim().toLowerCase();
        if (!empOwnerEmail) continue;
        const owner = await User.findOne({ email: empOwnerEmail });
        if (!owner) continue;
        ownerUser = owner;
        ownerEmail = empOwnerEmail;
        actingEmployee = {
          id: String(emp._id || ""),
          email: String(emp.email || ""),
          name: String(emp.name || ""),
        };
        break;
      }
    }

    if (!ownerUser) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    if (ownerUser.canLogin === false) {
      return NextResponse.json(
        { error: "Login access has been revoked. Please contact support.", code: "LOGIN_REVOKED" },
        { status: 403 }
      );
    }

    try {
      await syncSubscriptionWithAccountTier(ownerEmail);
    } catch (_) {
      /* ignore */
    }

    const subRevokeReason = await getLoginBlockReason(ownerEmail);
    if (subRevokeReason) {
      return NextResponse.json(
        { error: subRevokeReason, code: "SUBSCRIPTION_REVOKED" },
        { status: 403 }
      );
    }

    const listingOnly = await userIsListingOnlyAccount(ownerEmail);
    const calculatorOnlyAccount = await userIsCalculatorOnlyPortalAccount(ownerEmail);

    try {
      await recordPortalLogin(ownerEmail);
    } catch (_) {
      /* ignore */
    }

    const token = await createPortalToken({
      email: ownerEmail,
      shopName: ownerUser.shopName,
      contactName: ownerUser.contactName,
      authType: actingEmployee ? "employee" : "owner",
      employeeId: actingEmployee?.id || "",
      employeeEmail: actingEmployee?.email || "",
      calculatorOnlyPortal: calculatorOnlyAccount,
    });
    const cookieStore = await cookies();
    await setPortalSessionCookies(cookieStore, { token, calculatorOnlyPortal: calculatorOnlyAccount });

    return NextResponse.json({
      ok: true,
      user: {
        email: ownerEmail,
        shopName: ownerUser.shopName,
        contactName: ownerUser.contactName,
        listingOnlyAccount: listingOnly,
        calculatorOnlyAccount,
        isEmployeeSession: Boolean(actingEmployee),
        employee: actingEmployee,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: err.message || "Login failed" },
      { status: 500 }
    );
  }
}
