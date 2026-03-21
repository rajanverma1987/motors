import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Employee from "@/models/Employee";
import User from "@/models/User";
import UserSettings from "@/models/UserSettings";
import { verifyPassword, createTechnicianToken } from "@/lib/auth-portal";
import { checkRateLimit } from "@/lib/rate-limit";
import { mergeUserSettings } from "@/lib/user-settings";

export async function POST(request) {
  const { allowed } = checkRateLimit(request, "tech-login", 15);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const emailRaw = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    if (!emailRaw || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    await connectDB();
    const candidates = await Employee.find({ email: emailRaw }).select("+passwordHash").lean();

    let employee = null;
    for (const c of candidates) {
      if (!c.technicianAppAccess) continue;
      if (!c.passwordHash) continue;
      const ok = await verifyPassword(password, c.passwordHash);
      if (ok) {
        employee = c;
        break;
      }
    }

    if (!employee) {
      return NextResponse.json(
        { error: "Invalid credentials or Technician App access is not enabled for this account." },
        { status: 401 }
      );
    }

    const shopEmail = String(employee.createdByEmail || "")
      .trim()
      .toLowerCase();

    const owner = await User.findOne({ email: shopEmail }).select("canLogin").lean();
    if (!owner || owner.canLogin === false) {
      return NextResponse.json(
        {
          error: "Login access has been revoked for this shop. Please contact support.",
          code: "LOGIN_REVOKED",
        },
        { status: 403 }
      );
    }

    const us = await UserSettings.findOne({ ownerEmail: shopEmail }).lean();
    const merged = mergeUserSettings(us?.settings || {});

    const token = await createTechnicianToken({
      employeeId: employee._id.toString(),
      shopEmail,
      name: employee.name || "",
      employeeEmail: employee.email || emailRaw,
    });

    return NextResponse.json({
      token,
      employee: {
        id: employee._id.toString(),
        name: employee.name || "",
        email: employee.email || emailRaw,
      },
      shop: { email: shopEmail },
      workOrderStatuses: merged.workOrderStatuses || [],
    });
  } catch (err) {
    console.error("Tech login error:", err);
    return NextResponse.json({ error: err.message || "Login failed" }, { status: 500 });
  }
}
