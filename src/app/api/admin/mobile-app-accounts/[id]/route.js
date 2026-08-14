import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import MobileAppAccount from "@/models/MobileAppAccount";
import { getAdminFromRequest } from "@/lib/auth-admin";
import {
  mobileAppAccountToAdminJson,
  revokeMobileAppAccess,
} from "@/lib/mobile-app-subscription";

export const dynamic = "force-dynamic";

async function getId(context) {
  const params = typeof context.params?.then === "function" ? await context.params : context.params;
  return params?.id;
}

export async function PATCH(request, context) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const id = await getId(context);
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    const body = await request.json().catch(() => ({}));
    await connectDB();
    const account = await MobileAppAccount.findById(id);
    if (!account) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (body.revokeAccess === true) {
      await revokeMobileAppAccess(account);
    }
    if (typeof body.canLogin === "boolean") {
      account.canLogin = body.canLogin;
      if (body.canLogin === false && body.revokeAccess !== true) {
        await revokeMobileAppAccess(account);
      } else {
        await account.save();
      }
    }

    const fresh = await MobileAppAccount.findById(id).select("-passwordHash").lean();
    return NextResponse.json({ account: mobileAppAccountToAdminJson(fresh) });
  } catch (err) {
    console.error("PATCH admin mobile-app-account:", err);
    return NextResponse.json({ error: err.message || "Failed to update" }, { status: 500 });
  }
}
