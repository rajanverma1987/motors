import { NextResponse } from "next/server";
import { getPortalUserFromRequest } from "@/lib/auth-portal";

export async function GET(request) {
  const user = await getPortalUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({ user });
}
