import { NextResponse } from "next/server";
import { getPublicJobPostings } from "@/lib/job-postings-public";

/** Public list of open jobs (for clients / future API consumers). */
export async function GET() {
  try {
    const jobs = await getPublicJobPostings();
    return NextResponse.json({ jobs });
  } catch (err) {
    console.error("Public job postings error:", err);
    return NextResponse.json({ error: "Failed to load jobs" }, { status: 500 });
  }
}
