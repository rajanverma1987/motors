import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearPortalSessionCookies } from "@/lib/auth-portal";

export async function POST() {
  const cookieStore = await cookies();
  clearPortalSessionCookies(cookieStore);
  return NextResponse.json({ ok: true });
}
