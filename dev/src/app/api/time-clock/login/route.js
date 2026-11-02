import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Employee from "@/models/Employee";
import { findShopByTimeClockToken } from "@/lib/time-clock-settings";
import {
  buildAuthenticationOptions,
  consumeChallenge,
  verifyAuthentication,
} from "@/lib/time-clock-webauthn";
import {
  createTimeClockSessionToken,
  getTimeClockCookieName,
  timeClockSessionCookieOptions,
} from "@/lib/time-clock-session";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = String(body.token || "").trim();
    if (!token) {
      return NextResponse.json({ error: "token required" }, { status: 400 });
    }
    await connectDB();
    const shop = await findShopByTimeClockToken(token);
    if (!shop) {
      return NextResponse.json({ error: "Invalid time clock link" }, { status: 404 });
    }
    const { options } = await buildAuthenticationOptions({
      request,
      shopEmail: shop.ownerEmail,
      allowCredentials: [],
    });
    return NextResponse.json({ options });
  } catch (err) {
    console.error("Time clock login options error:", err);
    return NextResponse.json({ error: err.message || "Failed to start login" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = String(body.token || "").trim();
    const response = body.response;
    const challenge = String(body.expectedChallenge || body.challenge || "").trim();
    if (!token || !response || !challenge) {
      return NextResponse.json({ error: "Missing login fields" }, { status: 400 });
    }
    await connectDB();
    const shop = await findShopByTimeClockToken(token);
    if (!shop) {
      return NextResponse.json({ error: "Invalid time clock link" }, { status: 404 });
    }
    const consumed = await consumeChallenge({
      shopEmail: shop.ownerEmail,
      challenge,
      kind: "authentication",
    });
    if (!consumed) {
      return NextResponse.json({ error: "Login challenge expired. Try again." }, { status: 400 });
    }

    const credentialId = String(response?.id || "").trim();
    const emp = await Employee.findOne({
      createdByEmail: shop.ownerEmail,
      "passkeys.credentialId": credentialId,
      timeClockEnabled: { $ne: false },
      employmentStatus: "Active",
    });
    if (!emp) {
      return NextResponse.json(
        { error: "No passkey found. Register with your work email first." },
        { status: 404 }
      );
    }
    const passkey = (emp.passkeys || []).find((p) => p.credentialId === credentialId);
    if (!passkey) {
      return NextResponse.json({ error: "Passkey not found" }, { status: 404 });
    }

    const { newCounter } = await verifyAuthentication({
      request,
      shopEmail: shop.ownerEmail,
      response,
      expectedChallenge: challenge,
      passkey,
    });
    passkey.counter = newCounter;
    await emp.save();

    const sessionToken = await createTimeClockSessionToken({
      shopEmail: shop.ownerEmail,
      employeeId: String(emp._id),
      employeeName: emp.name || "",
      timeClockToken: token,
    });
    const res = NextResponse.json({
      ok: true,
      employee: { id: String(emp._id), name: emp.name || "" },
    });
    res.cookies.set(getTimeClockCookieName(), sessionToken, timeClockSessionCookieOptions());
    return res;
  } catch (err) {
    console.error("Time clock login verify error:", err);
    return NextResponse.json({ error: err.message || "Login failed" }, { status: 500 });
  }
}
