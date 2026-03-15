import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import AreaNotifyRequest from "@/models/AreaNotifyRequest";

/**
 * POST: Save "notify me when there's a listing in my area" request.
 * Body: { email: string, city?: string, state?: string, zip?: string }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const email = (body?.email ?? "").trim().toLowerCase();
    const city = (body?.city ?? "").trim();
    const state = (body?.state ?? "").trim();
    const zip = (body?.zip ?? "").trim();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    await connectDB();
    await AreaNotifyRequest.findOneAndUpdate(
      { email, city, state, zip },
      { email, city, state, zip },
      { upsert: true, new: true }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Area notify request error:", err);
    return NextResponse.json(
      { error: err.message || "Request failed" },
      { status: 500 }
    );
  }
}
