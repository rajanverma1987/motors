import { NextResponse } from "next/server";
import { getMobileAppAccountFromRequest, mobileAppUnauthorized, mobileAppSessionPayload } from "@/lib/mobile-app-auth";
import { LIMITS, clampString } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function PATCH(request) {
  try {
    const account = await getMobileAppAccountFromRequest(request);
    if (!account) {
      return NextResponse.json(mobileAppUnauthorized(), { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    if (body.name !== undefined) {
      const name = clampString(body.name, LIMITS.name.max);
      if (!name) {
        return NextResponse.json({ error: "Name is required." }, { status: 400 });
      }
      account.name = name;
    }
    if (body.phone !== undefined) {
      account.phone = clampString(body.phone, 40);
    }
    await account.save();
    const session = await mobileAppSessionPayload(account);
    return NextResponse.json({ account: session });
  } catch (err) {
    console.error("mobile-app profile:", err);
    return NextResponse.json({ error: err.message || "Failed to update profile" }, { status: 500 });
  }
}
