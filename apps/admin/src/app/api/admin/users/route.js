import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import AdminUser from "@/models/AdminUser";
import { getAdminFromRequest, hashPassword } from "@/lib/auth-admin";
import { adminCan, normalizeAdminRole } from "@/lib/admin-rbac";

/** List / invite platform admins (Owner only for invite). */
export async function GET(request) {
  const email = await getAdminFromRequest(request);
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const users = await AdminUser.find({}).select("-passwordHash").sort({ createdAt: 1 }).lean();
  return NextResponse.json({
    users,
    bootstrapOwnerEmail: String(process.env.ADMIN_EMAIL || "").toLowerCase(),
  });
}

export async function POST(request) {
  const actor = await getAdminFromRequest(request);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Env bootstrap admin acts as owner; DB users use their role
  await dbConnect();
  let role = "owner";
  const actorRow = await AdminUser.findOne({ email: actor }).lean();
  if (actorRow) role = normalizeAdminRole(actorRow.role);
  else if (actor !== String(process.env.ADMIN_EMAIL || "").toLowerCase()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!adminCan(role, "admin.users.manage")) {
    return NextResponse.json({ error: "Only Owner can invite admins" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const name = String(body.name || "").trim();
  const newRole = normalizeAdminRole(body.role || "admin");
  if (!email || password.length < 8) {
    return NextResponse.json({ error: "email and password (8+) required" }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const doc = await AdminUser.findOneAndUpdate(
    { email },
    {
      $set: {
        email,
        passwordHash,
        name,
        role: newRole,
        canLogin: true,
        invitedByEmail: actor,
      },
    },
    { upsert: true, new: true }
  ).select("-passwordHash");

  return NextResponse.json({ user: doc });
}
