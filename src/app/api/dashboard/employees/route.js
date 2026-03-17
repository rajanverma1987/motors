import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Employee from "@/models/Employee";
import { getPortalUserFromRequest, hashPassword } from "@/lib/auth-portal";
import { isValidEmail, LIMITS, clampString } from "@/lib/validation";

function toEmployeeJson(e) {
  const id = e._id;
  return {
    id: id != null ? id.toString() : undefined,
    name: e.name ?? "",
    email: e.email ?? "",
    role: e.role ?? "",
    phone: e.phone ?? "",
    canLogin: Boolean(e.canLogin),
  };
}

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const list = await Employee.find({ createdByEmail: email })
      .sort({ name: 1, createdAt: -1 })
      .lean();
    return NextResponse.json(list.map((e) => toEmployeeJson(e)));
  } catch (err) {
    console.error("Dashboard list employees error:", err);
    return NextResponse.json({ error: "Failed to list employees" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const body = await request.json();
    const { name, email, role, phone, canLogin, password } = body;
    if (!name?.trim()) {
      return NextResponse.json({ error: "Employee name is required" }, { status: 400 });
    }
    if (email?.trim() && !isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    const rawPassword = typeof password === "string" ? password.trim() : "";
    if (rawPassword.length > 0) {
      if (rawPassword.length < LIMITS.password.min || rawPassword.length > LIMITS.password.max) {
        return NextResponse.json(
          { error: `Password must be between ${LIMITS.password.min} and ${LIMITS.password.max} characters.` },
          { status: 400 }
        );
      }
    }
    let passwordHash = "";
    if (rawPassword.length > 0) {
      passwordHash = await hashPassword(rawPassword);
    }
    const doc = await Employee.create({
      name: clampString(name, LIMITS.name.max),
      email: email?.trim() ? email.trim().toLowerCase().slice(0, LIMITS.email.max) : "",
      role: clampString(role ?? "", LIMITS.shortText.max),
      phone: clampString(phone ?? "", 30),
      canLogin: Boolean(canLogin),
      passwordHash,
      createdByEmail: user.email.trim().toLowerCase(),
    });
    return NextResponse.json({
      ok: true,
      employee: toEmployeeJson(doc),
    });
  } catch (err) {
    console.error("Dashboard create employee error:", err);
    return NextResponse.json({ error: err.message || "Failed to create employee" }, { status: 500 });
  }
}
