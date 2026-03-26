import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SalesPerson from "@/models/SalesPerson";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { isValidEmail, LIMITS, clampString } from "@/lib/validation";

function toSalesPersonJson(doc) {
  const row = doc && (doc.toObject ? doc.toObject() : doc);
  if (!row) return null;
  return {
    id: row._id?.toString(),
    name: row.name ?? "",
    phone: row.phone ?? "",
    email: row.email ?? "",
    bankDetail: row.bankDetail ?? "",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const ownerEmail = user.email.trim().toLowerCase();
    const rows = await SalesPerson.find({ createdByEmail: ownerEmail }).sort({ name: 1, createdAt: -1 }).lean();
    return NextResponse.json(rows.map((row) => toSalesPersonJson(row)));
  } catch (err) {
    console.error("Dashboard list sales persons error:", err);
    return NextResponse.json({ error: "Failed to list sales persons" }, { status: 500 });
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
    const name = clampString(body?.name, LIMITS.name.max);
    const phone = clampString(body?.phone, 30);
    const emailInput = clampString(body?.email, LIMITS.email.max).toLowerCase();
    const bankDetail = clampString(body?.bankDetail, LIMITS.shortText.max);

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (emailInput && !isValidEmail(emailInput)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const created = await SalesPerson.create({
      name,
      phone,
      email: emailInput,
      bankDetail,
      createdByEmail: user.email.trim().toLowerCase(),
    });

    return NextResponse.json({ ok: true, salesPerson: toSalesPersonJson(created) });
  } catch (err) {
    console.error("Dashboard create sales person error:", err);
    return NextResponse.json({ error: err.message || "Failed to create sales person" }, { status: 500 });
  }
}
