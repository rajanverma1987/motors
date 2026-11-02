import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import JobSeekerProfile from "@/models/JobSeekerProfile";
import {
  getTalentProfileFromRequest,
  serializeTalentProfile,
} from "@/lib/talent-auth";
import { computeTalentProfileScore } from "@/lib/talent-score";
import { generateUniqueTalentSlug, slugifyTalentName } from "@/lib/talent-slug";
import {
  TALENT_AVAILABILITY,
  TALENT_EMPLOYMENT_TYPES,
  TALENT_EXPERIENCE_LEVELS,
  TALENT_ROLES,
  TALENT_SKILLS,
  US_STATE_CODES,
} from "@/lib/talent-constants";
import { clampString, LIMITS } from "@/lib/validation";

const SKILL_SET = new Set(TALENT_SKILLS.map((s) => s.value));
const ROLE_SET = new Set(TALENT_ROLES.map((s) => s.value));
const EMP_SET = new Set(TALENT_EMPLOYMENT_TYPES.map((s) => s.value));
const STATE_SET = new Set(US_STATE_CODES);

function normalizeStringList(value, allowed) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const raw of value) {
    const v = String(raw || "").trim();
    if (!v) continue;
    if (allowed && !allowed.has(v)) continue;
    if (!out.includes(v)) out.push(v);
  }
  return out;
}

function normalizeStates(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const raw of value) {
    const v = String(raw || "")
      .trim()
      .toUpperCase();
    if (!STATE_SET.has(v)) continue;
    if (!out.includes(v)) out.push(v);
  }
  return out;
}

export async function GET(request) {
  try {
    const profile = await getTalentProfileFromRequest(request);
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({
      profile: serializeTalentProfile(profile, { includePrivate: true }),
    });
  } catch (err) {
    console.error("Talent me GET error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const current = await getTalentProfileFromRequest(request);
    if (!current) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    await connectDB();

    const patch = {};
    if (body.fullName != null) patch.fullName = clampString(body.fullName, LIMITS.name.max);
    if (body.phone != null) patch.phone = clampString(body.phone, 40);
    if (body.headline != null) patch.headline = clampString(body.headline, 160);
    if (body.bio != null) {
      patch.bio = typeof body.bio === "string" ? body.bio.trim().slice(0, LIMITS.longText.max) : "";
    }
    if (body.city != null) patch.city = clampString(body.city, 80);
    if (body.state != null) {
      const st = String(body.state || "")
        .trim()
        .toUpperCase();
      patch.state = STATE_SET.has(st) ? st : "";
    }
    if (body.preferredAreas != null) patch.preferredAreas = normalizeStates(body.preferredAreas);
    if (body.willingToRelocate != null) patch.willingToRelocate = Boolean(body.willingToRelocate);
    if (body.availability != null && TALENT_AVAILABILITY.includes(body.availability)) {
      patch.availability = body.availability;
      if (body.availability === "not_looking") {
        patch.jobAlertsEnabled = false;
      }
    }
    if (body.yearsExperience != null) {
      const n = Number(body.yearsExperience);
      patch.yearsExperience = Number.isFinite(n) ? Math.max(0, Math.min(60, Math.floor(n))) : 0;
    }
    if (
      body.experienceLevel != null &&
      TALENT_EXPERIENCE_LEVELS.some((o) => o.value === body.experienceLevel)
    ) {
      patch.experienceLevel = body.experienceLevel;
    }
    if (body.skills != null) patch.skills = normalizeStringList(body.skills, SKILL_SET);
    if (body.roles != null) patch.roles = normalizeStringList(body.roles, ROLE_SET);
    if (body.employmentTypes != null) {
      patch.employmentTypes = normalizeStringList(body.employmentTypes, EMP_SET);
    }
    if (body.salaryExpectation != null) {
      patch.salaryExpectation = clampString(body.salaryExpectation, 80);
    }
    if (body.workAuthorization != null) {
      patch.workAuthorization = clampString(body.workAuthorization, 200);
    }
    if (body.linkedinUrl != null) patch.linkedinUrl = clampString(body.linkedinUrl, 300);
    if (body.portfolioUrl != null) patch.portfolioUrl = clampString(body.portfolioUrl, 300);
    if (body.jobAlertsEnabled != null) {
      const nextAvailability =
        patch.availability != null ? patch.availability : current.availability;
      if (nextAvailability === "not_looking") {
        patch.jobAlertsEnabled = false;
      } else {
        patch.jobAlertsEnabled = Boolean(body.jobAlertsEnabled);
      }
    }
    if (body.status === "active" || body.status === "paused") {
      patch.status = body.status;
    }

    const merged = { ...current, ...patch };
    patch.profileScore = computeTalentProfileScore(merged);

    if (patch.fullName && (!current.slug || current.slug.startsWith("seeker-") || !slugifyTalentName(current.fullName))) {
      // Keep existing slug for SEO stability once set with a real name; only refresh stub-like slugs.
      if (!current.fullName && patch.fullName) {
        patch.slug = await generateUniqueTalentSlug(patch.fullName, current.email);
      }
    }

    const doc = await JobSeekerProfile.findByIdAndUpdate(
      current._id,
      { $set: patch },
      { new: true, runValidators: true }
    ).lean();

    return NextResponse.json({
      ok: true,
      profile: serializeTalentProfile(doc, { includePrivate: true }),
    });
  } catch (err) {
    console.error("Talent me PUT error:", err);
    return NextResponse.json({ error: err.message || "Failed to save" }, { status: 500 });
  }
}
