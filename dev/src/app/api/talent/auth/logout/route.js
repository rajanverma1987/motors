import { NextResponse } from "next/server";
import { TALENT_COOKIE } from "@/lib/talent-constants";
import { talentCookieOptions } from "@/lib/talent-auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(TALENT_COOKIE, "", { ...talentCookieOptions(0), maxAge: 0 });
  return res;
}
