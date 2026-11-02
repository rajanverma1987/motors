import { NextResponse } from "next/server";
import { getPublicJobPostingBySlug } from "@/lib/job-postings-public";

export async function GET(request, context) {
  try {
    const params = typeof context.params?.then === "function" ? await context.params : context.params;
    const slug = params?.slug;
    const job = await getPublicJobPostingBySlug(slug);
    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ job });
  } catch (err) {
    console.error("Public job posting error:", err);
    return NextResponse.json({ error: "Failed to load job" }, { status: 500 });
  }
}
