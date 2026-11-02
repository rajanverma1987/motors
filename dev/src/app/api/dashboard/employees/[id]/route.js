import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Employee from "@/models/Employee";
import { getPortalUserFromRequest, hashPassword } from "@/lib/auth-portal";
import { isValidEmail, LIMITS, clampString } from "@/lib/validation";
import { getPasswordPolicyError } from "@/lib/password-policy";
import { applyEmployeeBodyFields, toEmployeeJson } from "@/lib/employee-record";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

export async function GET(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    await connectDB();
    const doc = await Employee.findOne({
      _id: id,
      createdByEmail: user.email.trim().toLowerCase(),
    }).lean();
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(toEmployeeJson(doc));
  } catch (err) {
    console.error("Dashboard get employee error:", err);
    return NextResponse.json({ error: "Failed to load employee" }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    await connectDB();
    const doc = await Employee.findOne({
      _id: id,
      createdByEmail: user.email.trim().toLowerCase(),
    }).select("+passwordHash");
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const body = await request.json();
    if (body.name !== undefined && !String(body.name).trim()) {
      return NextResponse.json({ error: "Employee name is required" }, { status: 400 });
    }
    if (body.email !== undefined && body.email?.trim() && !isValidEmail(body.email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    const nextTimeClock =
      body.timeClockEnabled !== undefined ? Boolean(body.timeClockEnabled) : doc.timeClockEnabled !== false;
    const nextEmail =
      body.email !== undefined
        ? body.email?.trim()
          ? String(body.email).trim().toLowerCase()
          : ""
        : String(doc.email || "").trim();
    if (nextTimeClock && !nextEmail) {
      return NextResponse.json(
        { error: "Email is required when time clock is enabled." },
        { status: 400 }
      );
    }
    applyEmployeeBodyFields(doc, body, { clampString, LIMITS });
    const rawPassword = typeof body.password === "string" ? body.password.trim() : "";
    if (rawPassword.length > 0) {
      if (rawPassword.length < LIMITS.password.min || rawPassword.length > LIMITS.password.max) {
        return NextResponse.json(
          {
            error: `Password must be between ${LIMITS.password.min} and ${LIMITS.password.max} characters.`,
          },
          { status: 400 }
        );
      }
      const passwordError = getPasswordPolicyError(rawPassword);
      if (passwordError) {
        return NextResponse.json({ error: passwordError }, { status: 400 });
      }
      doc.passwordHash = await hashPassword(rawPassword);
    }
    await doc.save();
    return NextResponse.json({
      ok: true,
      employee: toEmployeeJson(doc),
    });
  } catch (err) {
    console.error("Dashboard update employee error:", err);
    return NextResponse.json({ error: err.message || "Failed to update employee" }, { status: 500 });
  }
}
