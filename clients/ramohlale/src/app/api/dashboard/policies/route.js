import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Policy from "@/models/Policy";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { normalizeResources } from "@/lib/pbac";
import { LIMITS, clampString } from "@/lib/validation";

const MAX_SUBJECT_IDS = 200;

function toPolicyJson(doc) {
  const p = doc && (doc.toObject ? doc.toObject() : doc);
  if (!p) return null;
  return {
    id: p._id?.toString(),
    name: p.name ?? "",
    description: p.description ?? "",
    effect: p.effect ?? "allow",
    subjectType: p.subjectType ?? "employee",
    subjectIds: Array.isArray(p.subjectIds) ? p.subjectIds.filter(Boolean) : [],
    resources: Array.isArray(p.resources)
      ? p.resources.map((r) => ({
          page: r?.page ?? "",
          actions: Array.isArray(r?.actions) ? r.actions : [],
        }))
      : [],
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

function normalizeSubjectIds(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .slice(0, MAX_SUBJECT_IDS)
    .map((id) => (typeof id === "string" ? id.trim() : String(id).trim()))
    .filter(Boolean);
}

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const list = await Policy.find({ createdByEmail: email })
      .sort({ name: 1, createdAt: -1 })
      .lean();
    return NextResponse.json(list.map((d) => toPolicyJson(d)));
  } catch (err) {
    console.error("Dashboard list policies error:", err);
    return NextResponse.json({ error: "Failed to list policies" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const body = await request.json();
    const { name, description, effect, subjectType, subjectIds, resources } = body;
    if (!name?.trim()) {
      return NextResponse.json({ error: "Policy name is required" }, { status: 400 });
    }
    const normalizedResources = normalizeResources(resources);
    const doc = await Policy.create({
      name: clampString(name, LIMITS.name.max),
      description: clampString(description ?? "", LIMITS.message.max),
      effect: effect === "deny" ? "deny" : "allow",
      subjectType: subjectType === "employee" ? "employee" : "employee",
      subjectIds: normalizeSubjectIds(subjectIds),
      resources: normalizedResources,
      createdByEmail: user.email.trim().toLowerCase(),
    });
    return NextResponse.json({
      ok: true,
      policy: toPolicyJson(doc),
    });
  } catch (err) {
    console.error("Dashboard create policy error:", err);
    return NextResponse.json({ error: err.message || "Failed to create policy" }, { status: 500 });
  }
}
