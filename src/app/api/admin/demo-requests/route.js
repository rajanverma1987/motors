import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import DemoRequest from "@/models/DemoRequest";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { parseAdminSortParams, mongoSortFromAdmin } from "@/lib/admin-table-sort";

const DEMO_REQUEST_SORT_KEYS = [
  "name",
  "email",
  "businessName",
  "formType",
  "status",
  "notifyEmailStatus",
  "createdAt",
];

export function demoRequestToListRow(doc) {
  return {
    id: String(doc._id),
    formType: doc.formType || "demo",
    name: doc.name || "",
    email: doc.email || "",
    phone: doc.phone || "",
    businessName: doc.businessName || "",
    city: doc.city || "",
    state: doc.state || "",
    status: doc.status || "new",
    notifyEmailStatus: doc.notifyEmailStatus || "pending",
    createdAt: doc.createdAt || null,
  };
}

export async function GET(request) {
  try {
    const adminEmail = await getAdminFromRequest(request);
    if (!adminEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const formType = searchParams.get("formType");
    const emailStatus = searchParams.get("emailStatus");
    const search = (searchParams.get("search") || "").trim();
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 25));
    const skip = (page - 1) * pageSize;

    const q = {};
    if (status && status !== "all") q.status = status;
    if (formType && formType !== "all") q.formType = formType;
    if (emailStatus && emailStatus !== "all") q.notifyEmailStatus = emailStatus;
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      q.$or = [{ name: rx }, { email: rx }, { businessName: rx }];
    }

    const { sortBy, sortDir } = parseAdminSortParams(searchParams, {
      allowedKeys: DEMO_REQUEST_SORT_KEYS,
      defaultKey: "createdAt",
      defaultDir: "desc",
    });

    const [totalCount, list, newCount, failedEmailCount] = await Promise.all([
      DemoRequest.countDocuments(q),
      DemoRequest.find(q).sort(mongoSortFromAdmin(sortBy, sortDir)).skip(skip).limit(pageSize).lean(),
      DemoRequest.countDocuments({ status: "new" }),
      DemoRequest.countDocuments({ notifyEmailStatus: "failed" }),
    ]);

    return NextResponse.json({
      items: list.map(demoRequestToListRow),
      page,
      pageSize,
      totalCount,
      newCount,
      failedEmailCount,
    });
  } catch (err) {
    console.error("Demo requests list (admin):", err);
    return NextResponse.json({ error: "Failed to list demo requests" }, { status: 500 });
  }
}
