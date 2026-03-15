import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getAdminFromRequest } from "@/lib/auth-admin";

export async function GET(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const users = await User.find({})
      .select("_id email shopName contactName canLogin createdAt")
      .sort({ createdAt: -1 })
      .lean();
    const list = users.map((u) => ({
      id: String(u._id),
      email: u.email,
      shopName: u.shopName || "",
      contactName: u.contactName || "",
      canLogin: u.canLogin !== false,
      createdAt: u.createdAt,
    }));
    return NextResponse.json({ users: list });
  } catch (err) {
    console.error("Admin users list error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to list users" },
      { status: 500 }
    );
  }
}
