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
import { userIsTrialAccount } from "@/lib/trial-account-restrictions";
import { userIsCalculatorOnlyPortalAccount } from "@/lib/calculator-portal-tier";
import { recordPortalLogin } from "@/lib/portal-login-audit";
import { recordSecurityEvent } from "@/lib/security-audit";
import { loadShopPortalUi } from "@/lib/shop-portal-ui";
import Policy from "@/models/Policy";
import UserSettings from "@/models/UserSettings";
import { mergeUserSettings } from "@/lib/user-settings";
import { computeEffectiveFinancialAccess } from "@/lib/financial-access";

export async function POST(request) {
  const { allowed } = await checkRateLimit(request, "portal-login", 10);
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
      await recordSecurityEvent({
        event: "portal_login_fail",
        request,
        actorEmail: emailRaw,
        success: false,
      });
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
    const trialAccount = !listingOnly && (await userIsTrialAccount(ownerEmail));
    const calculatorOnlyAccount = await userIsCalculatorOnlyPortalAccount(ownerEmail);
    const portalUi = calculatorOnlyAccount ? "simple" : await loadShopPortalUi(ownerEmail);

    try {
      await recordPortalLogin(ownerEmail);
    } catch (_) {
      /* ignore */
    }

    const rememberMe = !!body?.rememberMe;
    const token = await createPortalToken(
      {
        email: ownerEmail,
        shopName: ownerUser.shopName,
        contactName: ownerUser.contactName,
        authType: actingEmployee ? "employee" : "owner",
        employeeId: actingEmployee?.id || "",
        employeeEmail: actingEmployee?.email || "",
        calculatorOnlyPortal: calculatorOnlyAccount,
      },
      { rememberMe }
    );
    const cookieStore = await cookies();
    await setPortalSessionCookies(cookieStore, {
      token,
      calculatorOnlyPortal: calculatorOnlyAccount,
      portalUi,
      rememberMe,
    });

    let employeeDoc = null;
    let policies = [];
    const userSettingsDoc = await UserSettings.findOne({ ownerEmail }).lean();
    const userSettings = mergeUserSettings(userSettingsDoc?.settings);

    if (actingEmployee?.id) {
      employeeDoc = await Employee.findById(actingEmployee.id).lean();
      policies = await Policy.find({
        createdByEmail: ownerEmail,
        effect: "allow",
        subjectType: "employee",
        subjectIds: String(actingEmployee.id),
      }).lean();
    }

    const financialAccess = computeEffectiveFinancialAccess({
      isOwner: !actingEmployee,
      employee: employeeDoc,
      policies,
      userSettings,
    });

    return NextResponse.json({
      ok: true,
      user: {
        email: ownerEmail,
        shopName: ownerUser.shopName,
        contactName: ownerUser.contactName,
        listingOnlyAccount: listingOnly,
        trialAccount,
        calculatorOnlyAccount,
        portalUi,
        isEmployeeSession: Boolean(actingEmployee),
        isEmployee: Boolean(actingEmployee),
        isOwner: !actingEmployee,
        employee: actingEmployee,
        authType: actingEmployee ? "employee" : "owner",
        employeeId: actingEmployee?.id || "",
        employeeName: employeeDoc?.name || "",
        employeeRole: employeeDoc?.role || "",
        canViewFinancials: financialAccess.canViewFinancials,
        isFinancialRestricted: financialAccess.isRestricted,
        financialAccessReason: financialAccess.reason,
        isSimulatedFinancialRestriction: financialAccess.isSimulated || false,
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
