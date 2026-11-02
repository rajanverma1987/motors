import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Policy from "@/models/Policy";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { normalizeResources } from "@/lib/pbac";
import { LIMITS, clampString } from "@/lib/validation";

const MAX_SUBJECT_IDS = 200;

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

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

export async function GET(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    await connectDB();
    const doc = await Policy.findOne({
      _id: id,
      createdByEmail: user.email.trim().toLowerCase(),
    }).lean();
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(toPolicyJson(doc));
  } catch (err) {
    console.error("Dashboard get policy error:", err);
    return NextResponse.json({ error: "Failed to load policy" }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    await connectDB();
    const doc = await Policy.findOne({
      _id: id,
      createdByEmail: user.email.trim().toLowerCase(),
    });
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const body = await request.json();
    const { name, description, effect, subjectIds, resources } = body;
    if (name !== undefined) {
      if (!String(name).trim()) {
        return NextResponse.json({ error: "Policy name is required" }, { status: 400 });
      }
      doc.name = clampString(name, LIMITS.name.max);
    }
    if (description !== undefined) doc.description = clampString(description, LIMITS.message.max);
    if (effect === "deny") doc.effect = "deny";
    else if (effect === "allow") doc.effect = "allow";
    if (subjectIds !== undefined) doc.subjectIds = normalizeSubjectIds(subjectIds);
    if (resources !== undefined) {
      doc.resources = normalizeResources(resources);
      doc.markModified("resources");
    }
    await doc.save();
    return NextResponse.json({
      ok: true,
      policy: toPolicyJson(doc),
    });
  } catch (err) {
    console.error("Dashboard update policy error:", err);
    return NextResponse.json({ error: err.message || "Failed to update policy" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const params = await getParams(context);
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }
    await connectDB();
    const doc = await Policy.findOneAndDelete({
      _id: id,
      createdByEmail: user.email.trim().toLowerCase(),
    });
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Dashboard delete policy error:", err);
    return NextResponse.json({ error: "Failed to delete policy" }, { status: 500 });
  }
}
