import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPortalCookieName } from "@/lib/auth-portal";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(getPortalCookieName());
  return NextResponse.json({ ok: true });
}
