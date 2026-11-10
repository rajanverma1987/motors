import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Employee from "@/models/Employee";
import { findShopByTimeClockToken } from "@/lib/time-clock-settings";
import {
  buildRegistrationOptions,
  consumeChallenge,
  verifyRegistration,
} from "@/lib/time-clock-webauthn";
import {
  createTimeClockSessionToken,
  getTimeClockCookieName,
  timeClockSessionCookieOptions,
} from "@/lib/time-clock-session";
import { toEmployeeJson } from "@/lib/employee-record";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = String(body.token || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    if (!token || !email) {
      return NextResponse.json({ error: "token and email required" }, { status: 400 });
    }
    await connectDB();
    const shop = await findShopByTimeClockToken(token);
    if (!shop) {
      return NextResponse.json({ error: "Invalid time clock link" }, { status: 404 });
    }
    const emp = await Employee.findOne({
      createdByEmail: shop.ownerEmail,
      email,
      timeClockEnabled: { $ne: false },
      employmentStatus: "Active",
    }).lean();
    if (!emp) {
      return NextResponse.json(
        { error: "No active time-clock employee matches that email." },
        { status: 404 }
      );
    }
    const employee = toEmployeeJson(emp);
    const { options } = await buildRegistrationOptions({
      request,
      shopEmail: shop.ownerEmail,
      employee,
      existingPasskeys: emp.passkeys || [],
    });
    return NextResponse.json({ options, employee: { id: employee.id, name: employee.name } });
  } catch (err) {
    console.error("Time clock register options error:", err);
    return NextResponse.json({ error: err.message || "Failed to start registration" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = String(body.token || "").trim();
    const employeeId = String(body.employeeId || "").trim();
    const response = body.response;
    const challenge = String(body.expectedChallenge || body.challenge || "").trim();
    if (!token || !employeeId || !response || !challenge) {
      return NextResponse.json({ error: "Missing registration fields" }, { status: 400 });
    }
    await connectDB();
    const shop = await findShopByTimeClockToken(token);
    if (!shop) {
      return NextResponse.json({ error: "Invalid time clock link" }, { status: 404 });
    }
    const consumed = await consumeChallenge({
      shopEmail: shop.ownerEmail,
      challenge,
      kind: "registration",
    });
    if (!consumed || String(consumed.employeeId) !== employeeId) {
      return NextResponse.json({ error: "Registration challenge expired. Try again." }, { status: 400 });
    }
    const emp = await Employee.findOne({
      _id: employeeId,
      createdByEmail: shop.ownerEmail,
      timeClockEnabled: { $ne: false },
      employmentStatus: "Active",
    });
    if (!emp) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    const passkey = await verifyRegistration({
      request,
      shopEmail: shop.ownerEmail,
      employeeId,
      response,
      expectedChallenge: challenge,
    });
    emp.passkeys = Array.isArray(emp.passkeys) ? emp.passkeys : [];
    emp.passkeys.push({
      credentialId: passkey.credentialId,
      publicKey: passkey.publicKey,
      counter: passkey.counter,
      transports: passkey.transports,
      createdAt: new Date(),
    });
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
    console.error("Time clock register verify error:", err);
    return NextResponse.json({ error: err.message || "Registration failed" }, { status: 500 });
  }
}
