import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import JobPosting from "@/models/JobPosting";
import Listing from "@/models/Listing";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { generateUniqueJobSlug } from "@/lib/job-posting-slug";
import { clampString, LIMITS } from "@/lib/validation";

function bodyFields(body) {
  return {
    title: clampString(body?.title, 300),
    description:
      typeof body?.description === "string" ? body.description.trim().slice(0, LIMITS.longText.max) : "",
    location: clampString(body?.location, LIMITS.shortText.max),
    department: clampString(body?.department, LIMITS.shortText.max),
    employmentType: ["full_time", "part_time", "contract", "temporary", "internship"].includes(
      body?.employmentType
    )
      ? body.employmentType
      : "full_time",
    experienceLevel: ["entry", "mid", "senior", "lead", "any"].includes(body?.experienceLevel)
      ? body.experienceLevel
      : "any",
    salaryDisplay: clampString(body?.salaryDisplay, LIMITS.shortText.max),
    responsibilities:
      typeof body?.responsibilities === "string"
        ? body.responsibilities.trim().slice(0, LIMITS.longText.max)
        : "",
    qualifications:
      typeof body?.qualifications === "string"
        ? body.qualifications.trim().slice(0, LIMITS.longText.max)
        : "",
    benefits: typeof body?.benefits === "string" ? body.benefits.trim().slice(0, LIMITS.longText.max) : "",
    status: ["draft", "open", "closed"].includes(body?.status) ? body.status : "draft",
  };
}

function serializeJob(doc, shopName = "") {
  return {
    ...doc,
    id: doc._id.toString(),
    _id: undefined,
    shopName: shopName || "",
  };
}

/** GET — list all postings, or ?shops=1 for approved listing dropdown options. */
export async function GET(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();

    const { searchParams } = new URL(request.url);
    if (searchParams.get("shops") === "1") {
      const listings = await Listing.find({
        status: "approved",
        email: { $exists: true, $nin: ["", null] },
      })
        .select({ companyName: 1, email: 1, city: 1, state: 1, zipCode: 1, urlSlug: 1 })
        .sort({ companyName: 1 })
        .lean();

      return NextResponse.json({
        shops: listings.map((L) => ({
          id: L._id.toString(),
          companyName: String(L.companyName || "").trim() || "Unnamed shop",
          email: String(L.email || "").trim().toLowerCase(),
          city: String(L.city || "").trim(),
          state: String(L.state || "").trim(),
          zipCode: String(L.zipCode || "").trim(),
          urlSlug: String(L.urlSlug || "").trim(),
          label: [
            String(L.companyName || "").trim() || "Unnamed shop",
            [L.city, L.state].filter(Boolean).join(", "),
            String(L.email || "").trim(),
          ]
            .filter(Boolean)
            .join(" — "),
        })),
      });
    }

    const list = await JobPosting.find({})
      .sort({ updatedAt: -1 })
      .limit(500)
      .lean();

    const emails = [...new Set(list.map((j) => String(j.ownerEmail || "").toLowerCase()).filter(Boolean))];
    const listings = emails.length
      ? await Listing.find({ email: { $in: emails } })
          .select({ email: 1, companyName: 1 })
          .lean()
      : [];
    const shopByEmail = {};
    for (const L of listings) {
      const em = String(L.email || "").toLowerCase().trim();
      if (em && !shopByEmail[em]) {
        shopByEmail[em] = String(L.companyName || "").trim();
      }
    }

    return NextResponse.json({
      items: list.map((doc) =>
        serializeJob(doc, shopByEmail[String(doc.ownerEmail || "").toLowerCase()] || "")
      ),
    });
  } catch (err) {
    console.error("Admin job postings GET error:", err);
    return NextResponse.json({ error: err.message || "Failed to load" }, { status: 500 });
  }
}

/** POST — create a job posting owned by the selected listing's email. */
export async function POST(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const listingId = String(body?.listingId || "").trim();
    if (!listingId) {
      return NextResponse.json({ error: "Select a motor shop." }, { status: 400 });
    }

    const f = bodyFields(body);
    if (!f.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    await connectDB();
    const listing = await Listing.findById(listingId)
      .select({ email: 1, companyName: 1, city: 1, state: 1, status: 1 })
      .lean();
    if (!listing) {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }
    if (String(listing.status || "") !== "approved") {
      return NextResponse.json({ error: "Only approved listings can receive job postings." }, { status: 400 });
    }

    const ownerEmail = String(listing.email || "").trim().toLowerCase();
    if (!ownerEmail) {
      return NextResponse.json(
        { error: "This listing has no email. Add an email on the listing before posting a job." },
        { status: 400 }
      );
    }

    const slug = await generateUniqueJobSlug(f.title);
    const doc = await JobPosting.create({
      ownerEmail,
      slug,
      ...f,
      listedOnMarketingSite: body?.listedOnMarketingSite !== false,
    });

    return NextResponse.json({
      ok: true,
      job: serializeJob(doc.toObject(), String(listing.companyName || "").trim()),
    });
  } catch (err) {
    console.error("Admin job posting create error:", err);
    return NextResponse.json({ error: err.message || "Failed to create" }, { status: 500 });
  }
}
