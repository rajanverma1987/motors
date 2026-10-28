import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "fs";
import path from "path";
import { connectDB } from "@/lib/db";
import JobSeekerProfile from "@/models/JobSeekerProfile";
import { getTalentProfileFromRequest, serializeTalentProfile } from "@/lib/talent-auth";
import { computeTalentProfileScore } from "@/lib/talent-score";
import { checkRateLimit } from "@/lib/rate-limit";

const UPLOAD_ROOT = "public/uploads/talent";
const MAX_SIZE_MB = 5;

function ownerDirKey(email) {
  return createHash("sha256")
    .update(String(email || "").trim().toLowerCase())
    .digest("hex")
    .slice(0, 24);
}

function isPdf(buffer, fileName) {
  const name = String(fileName || "").toLowerCase();
  if (!name.endsWith(".pdf")) return false;
  if (!buffer || buffer.length < 5) return false;
  return buffer.slice(0, 5).toString("utf8") === "%PDF-";
}

export async function POST(request) {
  const { allowed } = await checkRateLimit(request, "talent-resume-upload", 10);
  if (!allowed) {
    return NextResponse.json({ error: "Too many uploads. Try again later." }, { status: 429 });
  }
  try {
    const current = await getTalentProfileFromRequest(request);
    if (!current) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `File exceeds ${MAX_SIZE_MB}MB` }, { status: 400 });
    }
    if (!isPdf(buffer, file.name)) {
      return NextResponse.json({ error: "Upload a PDF resume only." }, { status: 400 });
    }

    const ownerKey = ownerDirKey(current.email);
    const dir = path.join(process.cwd(), UPLOAD_ROOT, ownerKey);
    mkdirSync(dir, { recursive: true });
    const safeName = `resume-${Date.now()}.pdf`;
    const filePath = path.join(dir, safeName);
    writeFileSync(filePath, buffer);
    const url = `/uploads/talent/${ownerKey}/${safeName}`;

    if (current.resumeUrl) {
      const old = String(current.resumeUrl);
      const prefix = `/uploads/talent/${ownerKey}/`;
      if (old.startsWith(prefix)) {
        const oldName = old.slice(prefix.length);
        const oldPath = path.join(dir, oldName);
        if (existsSync(oldPath)) {
          try {
            unlinkSync(oldPath);
          } catch {
            /* ignore */
          }
        }
      }
    }

    await connectDB();
    const merged = { ...current, resumeUrl: url };
    const doc = await JobSeekerProfile.findByIdAndUpdate(
      current._id,
      {
        $set: {
          resumeUrl: url,
          profileScore: computeTalentProfileScore(merged),
        },
      },
      { new: true }
    ).lean();

    return NextResponse.json({
      ok: true,
      profile: serializeTalentProfile(doc, { includePrivate: true }),
    });
  } catch (err) {
    console.error("Talent resume upload error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
