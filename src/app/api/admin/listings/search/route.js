import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Listing from "@/models/Listing";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { buildEmailToCrmUserIdMap, resolveListingCrmUserId } from "@/lib/listing-crm";

function digits(s) {
  return String(s || "").replace(/\D/g, "");
}

export async function GET(request) {
  try {
    const admin = await getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const emailRaw = (searchParams.get("email") || "").trim().toLowerCase();
    const phoneRaw = (searchParams.get("phone") || "").trim();
    const email = emailRaw.slice(0, 320);
    const phoneDigits = digits(phoneRaw);

    if (!email && phoneDigits.length < 7) {
      return NextResponse.json(
        { error: "Enter an email or a phone number (at least 7 digits)." },
        { status: 400 }
      );
    }

    await connectDB();

    if (email) {
      const doc = await Listing.findOne({ email }).lean();
      if (!doc) {
        return NextResponse.json({ listing: null });
      }
      const emailMap = await buildEmailToCrmUserIdMap([doc.email]);
      const resolvedCrmUserId = resolveListingCrmUserId(doc, emailMap);
      return NextResponse.json({
        listing: {
          ...doc,
          id: doc._id.toString(),
          _id: undefined,
          crmUserId: resolvedCrmUserId,
        },
      });
    }

    const candidates = await Listing.find({
      phone: { $exists: true, $nin: ["", null] },
    })
      .sort({ submittedAt: -1 })
      .limit(400)
      .lean();

    const tail = phoneDigits.slice(-10);
    const match = candidates.find((d) => {
      const pd = digits(d.phone);
      if (!pd || pd.length < 7) return false;
      return pd.endsWith(tail) || pd.includes(phoneDigits) || phoneDigits.includes(pd);
    });

    if (!match) {
      return NextResponse.json({ listing: null });
    }
    const emailMap = await buildEmailToCrmUserIdMap([match.email]);
    const resolvedCrmUserId = resolveListingCrmUserId(match, emailMap);
    return NextResponse.json({
      listing: {
        ...match,
        id: match._id.toString(),
        _id: undefined,
        crmUserId: resolvedCrmUserId,
      },
    });
  } catch (err) {
    console.error("Admin listing search error:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
