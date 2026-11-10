import { NextResponse } from "next/server";
import {
  LISTING_OWNER_EDIT_COOKIE,
  listingOwnerEditCookieOptions,
} from "@/lib/listing-owner-edit-auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(LISTING_OWNER_EDIT_COOKIE, "", { ...listingOwnerEditCookieOptions(0), maxAge: 0 });
  return res;
}
