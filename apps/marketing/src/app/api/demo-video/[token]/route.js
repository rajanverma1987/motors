import { createReadStream, existsSync, statSync } from "fs";
import path from "path";
import { Readable } from "stream";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import ListingMarketingEmail from "@/models/ListingMarketingEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function videoFilePath() {
  const candidates = [
    path.join(process.cwd(), "private", "3PhaseFlowDemo.mp4"),
    path.join(process.cwd(), "apps", "marketing", "private", "3PhaseFlowDemo.mp4"),
  ];
  return candidates.find((file) => existsSync(file)) || candidates[0];
}

async function tokenIsValid(token) {
  if (!token || token.length < 16) return false;
  await connectDB();
  const doc = await ListingMarketingEmail.findOne({ watchToken: token, status: "sent" })
    .select("_id")
    .lean();
  return Boolean(doc);
}

export async function GET(request, context) {
  const resolved = typeof context?.params?.then === "function" ? await context.params : context?.params;
  const token = String(resolved?.token || "").trim();
  if (!(await tokenIsValid(token))) {
    return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  let size = 0;
  const file = videoFilePath();
  try {
    size = statSync(file).size;
  } catch {
    return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  const range = request.headers.get("range");
  const common = {
    "Content-Type": "video/mp4",
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
  };

  if (!range) {
    return new NextResponse(Readable.toWeb(createReadStream(file)), {
      status: 200,
      headers: { ...common, "Content-Length": String(size) },
    });
  }

  const match = /bytes=(\d*)-(\d*)/.exec(range);
  if (!match) {
    return new NextResponse(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${size}` },
    });
  }

  let start = match[1] ? Number.parseInt(match[1], 10) : 0;
  let end = match[2] ? Number.parseInt(match[2], 10) : size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= size || start > end) {
    return new NextResponse(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${size}` },
    });
  }
  end = Math.min(end, size - 1);

  return new NextResponse(Readable.toWeb(createReadStream(file, { start, end })), {
    status: 206,
    headers: {
      ...common,
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${size}`,
    },
  });
}
