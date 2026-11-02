import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Tenant from "@/models/Tenant";
import { getAdminFromRequest } from "@/lib/auth-admin";

export async function GET(request) {
  const email = await getAdminFromRequest(request);
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const tenants = await Tenant.find({})
    .select("-platformTenantKeyHash -supportHandoffSecret")
    .sort({ createdAt: -1 })
    .lean();
  return NextResponse.json({ tenants });
}
