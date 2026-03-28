import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Employee from "@/models/Employee";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { deleteAllDataForRegisteredClient } from "@/lib/deleteRegisteredClientData";

export async function DELETE(request, context) {
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
    await connectDB();
    const user = await User.findById(id).select("_id email");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
    if (adminEmail && user.email?.toLowerCase?.() === adminEmail) {
      return NextResponse.json(
        { error: "Cannot delete the account that matches ADMIN_EMAIL." },
        { status: 403 }
      );
    }
    await deleteAllDataForRegisteredClient(user);
    await User.findByIdAndDelete(user._id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Admin user delete error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete user" },
      { status: 500 }
    );
  }
}

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
    const { canLogin, listingOnlyAccount } = body;
    const set = {};
    if (typeof canLogin === "boolean") set.canLogin = canLogin;
    if (typeof listingOnlyAccount === "boolean") set.listingOnlyAccount = listingOnlyAccount;
    if (Object.keys(set).length === 0) {
      return NextResponse.json(
        { error: "Provide canLogin and/or listingOnlyAccount (boolean)." },
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
      { $set: set },
      { new: true }
    ).select("_id email shopName contactName canLogin listingOnlyAccount");

    if (set.canLogin === false && existing.email) {
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
        listingOnlyAccount: user.listingOnlyAccount === true,
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
