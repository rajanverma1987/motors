import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAdminCookieName } from "@/lib/auth-admin";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(getAdminCookieName());
  return NextResponse.json({ ok: true });
}
