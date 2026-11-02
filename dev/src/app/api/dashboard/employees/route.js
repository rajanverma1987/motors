import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Employee from "@/models/Employee";
import { getPortalUserFromRequest, hashPassword } from "@/lib/auth-portal";
import { isValidEmail, LIMITS, clampString } from "@/lib/validation";
import { getPasswordPolicyError } from "@/lib/password-policy";
import { applyEmployeeBodyFields, toEmployeeJson } from "@/lib/employee-record";

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const { searchParams } = new URL(request.url);
    const includePagination =
      searchParams.has("page") || searchParams.has("pageSize") || searchParams.has("q");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 25));
    const skip = (page - 1) * pageSize;
    const qText = String(searchParams.get("q") || "").trim();
    const sortBy = String(searchParams.get("sortBy") || "name").trim();
    const sortDir = String(searchParams.get("sortDir") || "asc").toLowerCase() === "asc" ? "asc" : "desc";
    const sortFieldMap = {
      name: "name",
      role: "role",
      email: "email",
      phone: "phone",
      canLogin: "canLogin",
      technicianAppAccess: "technicianAppAccess",
      department: "department",
      employmentStatus: "employmentStatus",
      employeeNumber: "employeeNumber",
      createdAt: "createdAt",
    };
    const sortField = sortFieldMap[sortBy] || "name";
    const sort = { [sortField]: sortDir === "asc" ? 1 : -1, createdAt: -1 };
    const q = { createdByEmail: email };
    if (qText) {
      const rx = new RegExp(qText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      q.$or = [
        { name: rx },
        { email: rx },
        { role: rx },
        { phone: rx },
        { department: rx },
        { employeeNumber: rx },
      ];
    }
    const [totalCount, list] = await Promise.all([
      Employee.countDocuments(q),
      Employee.find(q).sort(sort).skip(skip).limit(pageSize).lean(),
    ]);
    const items = list.map((e) => toEmployeeJson(e));
    if (!includePagination) return NextResponse.json(items);
    return NextResponse.json({ items, page, pageSize, totalCount });
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
    const { name, email, password } = body;
    if (!name?.trim()) {
      return NextResponse.json({ error: "Employee name is required" }, { status: 400 });
    }
    if (email?.trim() && !isValidEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (body.timeClockEnabled !== false && !String(email || "").trim()) {
      return NextResponse.json(
        { error: "Email is required when time clock is enabled." },
        { status: 400 }
      );
    }
    const rawPassword = typeof password === "string" ? password.trim() : "";
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
    }
    let passwordHash = "";
    if (rawPassword.length > 0) {
      passwordHash = await hashPassword(rawPassword);
    }
    const doc = new Employee({
      createdByEmail: user.email.trim().toLowerCase(),
      passwordHash,
      name: clampString(name, LIMITS.name.max),
    });
    applyEmployeeBodyFields(doc, body, { clampString, LIMITS });
    await doc.save();
    return NextResponse.json({
      ok: true,
      employee: toEmployeeJson(doc),
    });
  } catch (err) {
    console.error("Dashboard create employee error:", err);
    return NextResponse.json({ error: err.message || "Failed to create employee" }, { status: 500 });
  }
}
