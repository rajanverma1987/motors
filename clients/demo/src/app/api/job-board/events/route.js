import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import UserSettings from "@/models/UserSettings";
import { subscribeJobBoardByToken } from "@/lib/job-board-broadcast";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = String(searchParams.get("token") || "").trim();
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }
  await connectDB();
  const ok = await UserSettings.exists({ "settings.jobBoardToken": token });
  if (!ok) {
    return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  }

  const encoder = new TextEncoder();
  let unsubscribe = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          /* closed */
        }
      };
      send(": ok\n\n");
      unsubscribe = subscribeJobBoardByToken(token, send);
      const ping = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          clearInterval(ping);
        }
      }, 25000);
      request.signal.addEventListener("abort", () => {
        clearInterval(ping);
        unsubscribe();
      });
    },
    cancel() {
      unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
