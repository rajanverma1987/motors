import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import JobSeekerProfile from "@/models/JobSeekerProfile";
import { serializeTalentProfile } from "@/lib/talent-auth";

export async function GET(_request, context) {
  try {
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const slug = String(params?.slug || "").trim();
    if (!slug) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await connectDB();
    const doc = await JobSeekerProfile.findOne({
      slug,
      status: "active",
      emailVerifiedAt: { $ne: null },
    }).lean();
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ profile: serializeTalentProfile(doc) });
  } catch (err) {
    console.error("Public talent get error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
