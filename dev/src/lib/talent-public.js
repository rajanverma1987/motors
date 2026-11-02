import { connectDB } from "@/lib/db";
import JobSeekerProfile from "@/models/JobSeekerProfile";

export async function getPublicTalentSlugs() {
  await connectDB();
  const rows = await JobSeekerProfile.find({
    status: "active",
    emailVerifiedAt: { $ne: null },
    slug: { $exists: true, $nin: [null, ""] },
    fullName: { $exists: true, $nin: [null, ""] },
  })
    .select("slug updatedAt")
    .lean();
  return rows.map((r) => ({
    slug: String(r.slug),
    updatedAt: r.updatedAt || null,
  }));
}
