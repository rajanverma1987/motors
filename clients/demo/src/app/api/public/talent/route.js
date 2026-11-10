import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import JobSeekerProfile from "@/models/JobSeekerProfile";
import { serializeTalentProfile } from "@/lib/talent-auth";
import { US_STATE_CODES } from "@/lib/talent-constants";

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const q = String(searchParams.get("q") || "")
      .trim()
      .toLowerCase();
    const state = String(searchParams.get("state") || "")
      .trim()
      .toUpperCase();
    const skill = String(searchParams.get("skill") || "").trim();
    const availability = String(searchParams.get("availability") || "").trim();

    const filter = {
      status: "active",
      emailVerifiedAt: { $ne: null },
      fullName: { $exists: true, $nin: [null, ""] },
    };
    if (state && US_STATE_CODES.includes(state)) {
      filter.$or = [{ state }, { preferredAreas: state }];
    }
    if (skill) filter.skills = skill;
    if (availability) filter.availability = availability;

    let rows = await JobSeekerProfile.find(filter)
      .sort({ profileScore: -1, updatedAt: -1 })
      .limit(200)
      .lean();

    if (q) {
      rows = rows.filter((r) => {
        const hay = [
          r.fullName,
          r.headline,
          r.city,
          r.state,
          ...(r.skills || []),
          ...(r.roles || []),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    return NextResponse.json({
      rows: rows.map((r) => serializeTalentProfile(r)),
    });
  } catch (err) {
    console.error("Public talent list error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
