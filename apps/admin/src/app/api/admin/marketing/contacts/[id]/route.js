import { NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/auth-admin";

/** Legacy contact update/delete. Replaced by listing marketing. */
export async function PATCH(request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(
    { error: "Marketing contacts were replaced by approved listings." },
    { status: 410 }
  );
}

export async function DELETE(request) {
  const admin = await getAdminFromRequest(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(
    { error: "Marketing contacts were replaced by approved listings." },
    { status: 410 }
  );
}
