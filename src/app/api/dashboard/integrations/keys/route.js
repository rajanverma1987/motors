import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import IntegrationApiKey from "@/models/IntegrationApiKey";
import { generatePlainIntegrationKey } from "@/lib/integration-auth";

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const email = user.email.trim().toLowerCase();
    await connectDB();
    const list = await IntegrationApiKey.find({ ownerEmail: email }).sort({ createdAt: -1 }).lean();
    return NextResponse.json({
      keys: list.map((k) => ({
        id: String(k._id),
        name: k.name,
        keyPrefix: k.keyPrefix,
        active: k.active,
        scopes: k.scopes || ["*"],
        createdAt: k.createdAt,
        lastUsedAt: k.lastUsedAt,
        expiresAt: k.expiresAt,
      })),
    });
  } catch (err) {
    console.error("GET integration keys:", err);
    return NextResponse.json({ error: "Failed to load keys" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const name = String(body.name || "API key").trim().slice(0, 120);
    const scopes = Array.isArray(body.scopes) && body.scopes.length ? body.scopes : ["*"];
    const email = user.email.trim().toLowerCase();
    const { key, keyPrefix, keyHash } = generatePlainIntegrationKey();

    await connectDB();
    const doc = await IntegrationApiKey.create({
      ownerEmail: email,
      name,
      keyPrefix,
      keyHash,
      scopes,
      active: true,
    });

    return NextResponse.json({
      ok: true,
      key,
      item: {
        id: String(doc._id),
        name: doc.name,
        keyPrefix: doc.keyPrefix,
        active: doc.active,
        scopes: doc.scopes || ["*"],
      },
    });
  } catch (err) {
    console.error("POST integration key:", err);
    return NextResponse.json({ error: "Failed to create key" }, { status: 500 });
  }
}
