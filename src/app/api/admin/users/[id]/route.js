import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Employee from "@/models/Employee";
import { getAdminFromRequest } from "@/lib/auth-admin";

export async function PATCH(request, context) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }
    const body = await request.json();
    const { canLogin } = body;
    if (typeof canLogin !== "boolean") {
      return NextResponse.json(
        { error: "canLogin (boolean) required" },
        { status: 400 }
      );
    }
    await connectDB();
    const existing = await User.findById(id).select("email");
    if (!existing) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { canLogin },
      { new: true }
    ).select("_id email shopName contactName canLogin");

    if (canLogin === false && existing.email) {
      await Employee.updateMany(
        { createdByEmail: existing.email },
        { $set: { canLogin: false, technicianAppAccess: false } }
      );
    }
    return NextResponse.json({
      user: {
        id: String(user._id),
        email: user.email,
        shopName: user.shopName || "",
        contactName: user.contactName || "",
        canLogin: user.canLogin !== false,
      },
    });
  } catch (err) {
    console.error("Admin user update error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update user" },
      { status: 500 }
    );
  }
}
