import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Listing from "@/models/Listing";
import { getAdminFromRequest } from "@/lib/auth-admin";
import { buildEmailToCrmUserIdMap, resolveListingCrmUserId } from "@/lib/listing-crm";
import { allowsMultipleListingsForEmail } from "@/lib/listing-shared-email";
import {
  emailDomainMatchFilter,
  extractEmailDomain,
  shouldMatchListingsByEmailDomain,
} from "@/lib/listing-email-domain";
import { verifyListingEmail } from "@/lib/prospectlens-email-verify";

function digits(s) {
  return String(s || "").replace(/\D/g, "");
}

function mergeListingDocs(primary, extra) {
  const seen = new Set();
  const out = [];
  for (const doc of [...(primary || []), ...(extra || [])]) {
    if (!doc?._id) continue;
    const id = doc._id.toString();
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(doc);
  }
  return out;
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
      const allowsMultiple = allowsMultipleListingsForEmail(email);
      let docs = await Listing.find({ email }).sort({ submittedAt: -1 }).lean();

      let matchedByDomain = false;
      const domain = extractEmailDomain(email);
      if (!allowsMultiple && shouldMatchListingsByEmailDomain(email)) {
        const domainFilter = emailDomainMatchFilter(domain);
        if (domainFilter) {
          const domainDocs = await Listing.find(domainFilter).sort({ submittedAt: -1 }).lean();
          const before = docs.length;
          docs = mergeListingDocs(docs, domainDocs);
          matchedByDomain =
            docs.some((d) => String(d.email || "").trim().toLowerCase() !== email) ||
            (before === 0 && docs.length > 0);
        }
      }

      if (docs.length === 0) {
        const emailVerification = await verifyListingEmail(email);
        return NextResponse.json({
          listing: null,
          listings: [],
          allowsMultiple,
          matchedByDomain: false,
          emailDomain: domain || null,
          emailVerification,
        });
      }

      const emailMap = await buildEmailToCrmUserIdMap(docs.map((d) => d.email));
      const listings = docs.map((doc) => ({
        ...doc,
        id: doc._id.toString(),
        _id: undefined,
        crmUserId: resolveListingCrmUserId(doc, emailMap),
      }));

      return NextResponse.json({
        listing: listings[0],
        listings,
        allowsMultiple,
        matchedByDomain,
        emailDomain: domain || null,
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
