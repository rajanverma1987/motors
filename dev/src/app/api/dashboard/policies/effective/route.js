import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Policy from "@/models/Policy";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { mergePolicyResources, permissionsMapToObject } from "@/lib/pbac";

/**
 * GET ?employeeId=xxx
 * Returns effective permissions for an employee: all policies that include this employee
 * are merged; result is { permissions: { [pageId]: [actions] } }.
 * Use this for enforcement once employee login is in place.
 */
export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    if (!employeeId?.trim()) {
      return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const policies = await Policy.find({
      createdByEmail: email,
      effect: "allow",
      subjectType: "employee",
      subjectIds: employeeId.trim(),
    })
      .lean();
    const merged = mergePolicyResources(policies);
    const permissions = permissionsMapToObject(merged);
    return NextResponse.json({ permissions });
  } catch (err) {
    console.error("Dashboard effective permissions error:", err);
    return NextResponse.json({ error: "Failed to get effective permissions" }, { status: 500 });
  }
}
