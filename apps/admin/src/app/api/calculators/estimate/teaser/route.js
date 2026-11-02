import { NextResponse } from "next/server";
import { buildRewindCalculatorTeaserPreview } from "@/lib/calculator-estimate-server";

export const dynamic = "force-dynamic";

/** Public blurred price glimpse — does not consume credits or return exact unlock payload. */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { previewText } = await buildRewindCalculatorTeaserPreview(body);
    return NextResponse.json({ previewText });
  } catch (err) {
    console.error("calculators/estimate/teaser:", err);
    return NextResponse.json({ error: err.message || "Teaser failed" }, { status: 500 });
  }
}
