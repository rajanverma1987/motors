import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Customer from "@/models/Customer";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { randomBytes } from "crypto";

/**
 * GET ?customerId=xxx
 * Returns the customer portal URL for that customer. Creates a portalToken if the customer doesn't have one.
 */
export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId")?.trim();
    if (!customerId) {
      return NextResponse.json({ error: "customerId is required" }, { status: 400 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const customer = await Customer.findOne({
      _id: customerId,
      createdByEmail: email,
    });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    if (!customer.portalToken?.trim()) {
      let token;
      let exists = true;
      for (let i = 0; i < 5; i++) {
        token = randomBytes(24).toString("hex");
        const existing = await Customer.findOne({ portalToken: token }).lean();
        if (!existing) {
          exists = false;
          break;
        }
      }
      if (!exists && token) {
        customer.portalToken = token;
        await customer.save();
      } else {
        customer.portalToken = randomBytes(24).toString("hex");
        await customer.save();
      }
    }
    const baseUrl = (
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      "http://localhost:3000"
    ).replace(/\/$/, "");
    const url = `${baseUrl}/portal/${customer.portalToken}`;
    return NextResponse.json({
      url,
      token: customer.portalToken,
      customerId: customer._id.toString(),
    });
  } catch (err) {
    console.error("Dashboard customer portal link error:", err);
    return NextResponse.json({ error: "Failed to get portal link" }, { status: 500 });
  }
}
