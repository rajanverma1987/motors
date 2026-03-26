import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SalesPerson from "@/models/SalesPerson";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { isValidEmail, LIMITS, clampString } from "@/lib/validation";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

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
    const doc = await SalesPerson.findOne({
      _id: id,
      createdByEmail: user.email.trim().toLowerCase(),
    }).lean();

    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(toSalesPersonJson(doc));
  } catch (err) {
    console.error("Dashboard get sales person error:", err);
    return NextResponse.json({ error: "Failed to load sales person" }, { status: 500 });
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
    const doc = await SalesPerson.findOne({
      _id: id,
      createdByEmail: user.email.trim().toLowerCase(),
    });

    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();

    if (body?.name !== undefined) {
      doc.name = clampString(body.name, LIMITS.name.max);
      if (!doc.name) {
        return NextResponse.json({ error: "Name is required" }, { status: 400 });
      }
    }

    if (body?.phone !== undefined) {
      doc.phone = clampString(body.phone, 30);
    }

    if (body?.email !== undefined) {
      const email = clampString(body.email, LIMITS.email.max).toLowerCase();
      if (email && !isValidEmail(email)) {
        return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
      }
      doc.email = email;
    }

    if (body?.bankDetail !== undefined) {
      doc.bankDetail = clampString(body.bankDetail, LIMITS.shortText.max);
    }

    await doc.save();
    return NextResponse.json({ ok: true, salesPerson: toSalesPersonJson(doc) });
  } catch (err) {
    console.error("Dashboard update sales person error:", err);
    return NextResponse.json({ error: err.message || "Failed to update sales person" }, { status: 500 });
  }
}
