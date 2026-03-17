import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Employee from "@/models/Employee";
import { getPortalUserFromRequest, hashPassword } from "@/lib/auth-portal";
import { isValidEmail, LIMITS, clampString } from "@/lib/validation";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

function toEmployeeJson(doc) {
  const e = doc && (doc.toObject ? doc.toObject() : doc);
  if (!e) return null;
  return {
    id: e._id?.toString(),
    name: e.name ?? "",
    email: e.email ?? "",
    role: e.role ?? "",
    phone: e.phone ?? "",
    canLogin: Boolean(e.canLogin),
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
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
    const { name, email, role, phone, canLogin, password } = body;
    if (name !== undefined) {
      if (!String(name).trim()) {
        return NextResponse.json({ error: "Employee name is required" }, { status: 400 });
      }
      doc.name = clampString(name, LIMITS.name.max);
    }
    if (email !== undefined) {
      if (email?.trim() && !isValidEmail(email)) {
        return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
      }
      doc.email = email?.trim() ? email.trim().toLowerCase().slice(0, LIMITS.email.max) : "";
    }
    if (role !== undefined) doc.role = clampString(role, LIMITS.shortText.max);
    if (phone !== undefined) doc.phone = clampString(phone, 30);
    if (canLogin !== undefined) doc.canLogin = Boolean(canLogin);
    const rawPassword = typeof password === "string" ? password.trim() : "";
    if (rawPassword.length > 0) {
      if (rawPassword.length < LIMITS.password.min || rawPassword.length > LIMITS.password.max) {
        return NextResponse.json(
          { error: `Password must be between ${LIMITS.password.min} and ${LIMITS.password.max} characters.` },
          { status: 400 }
        );
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
