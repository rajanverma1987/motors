import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import JobSeekerProfile from "@/models/JobSeekerProfile";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { serializeTalentProfile } from "@/lib/talent-auth";
import { TALENT_STATUS } from "@/lib/talent-constants";

export async function GET(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectDB();

    const { searchParams } = new URL(request.url);
    const q = String(searchParams.get("q") || "")
      .trim()
      .toLowerCase();
    const status = String(searchParams.get("status") || "").trim();

    const filter = {};
    if (status && TALENT_STATUS.includes(status)) filter.status = status;

    let rows = await JobSeekerProfile.find(filter).sort({ createdAt: -1 }).limit(1000).lean();
    if (q) {
      rows = rows.filter((r) => {
        const hay = [r.fullName, r.email, r.city, r.state, r.headline, r.slug].join(" ").toLowerCase();
        return hay.includes(q);
      });
    }

    return NextResponse.json({
      rows: rows.map((r) => serializeTalentProfile(r, { includePrivate: true })),
      total: rows.length,
    });
  } catch (err) {
    console.error("Admin talent list error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
