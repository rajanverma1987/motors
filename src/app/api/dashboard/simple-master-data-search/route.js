import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import SimpleServiceProposal from "@/models/SimpleServiceProposal";
import { MASTER_DATA_SEARCH_FORMS } from "@/lib/simple-datasheet-form";
import {
  buildMasterDataSearchAndClauses,
  collectFilledMasterDataCriteria,
  getDottedValue,
} from "@/lib/master-data-search";

const MAX_RESULTS = 200;

/**
 * POST body:
 *  - formId: "ac" | "dc" | "armature"
 *  - criteria: { [blockId]: { [fieldKey]: string } }
 */
export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const formId = String(body.formId || "").trim();
    const form = MASTER_DATA_SEARCH_FORMS[formId];
    if (!form) {
      return NextResponse.json(
        { error: "Invalid form. Use ac, dc, or armature." },
        { status: 400 }
      );
    }

    const criteria =
      body.criteria && typeof body.criteria === "object" && !Array.isArray(body.criteria)
        ? body.criteria
        : {};

    const filled = collectFilledMasterDataCriteria(formId, criteria);
    if (filled.length === 0) {
      return NextResponse.json(
        { error: "Enter at least one search field. Use * for wildcards (e.g. *text* or text*)." },
        { status: 400 }
      );
    }

    const email = user.email.trim().toLowerCase();
    const andClauses = buildMasterDataSearchAndClauses(filled);

    await connectDB();
    const docs = await SimpleServiceProposal.find({
      createdByEmail: email,
      $and: andClauses,
    })
      .select({
        documentNumber: 1,
        quote: 1,
        companyName: 1,
        customerId: 1,
        acDatasheet: 1,
        dcDatasheet: 1,
      })
      .sort({ updatedAt: -1 })
      .limit(MAX_RESULTS)
      .lean();

    const rows = docs.map((doc) => {
      const fields = {};
      for (const c of filled) {
        const raw = getDottedValue(doc, c.path);
        fields[`${c.blockId}.${c.fieldKey}`] = raw == null || raw === "" ? "" : String(raw);
      }
      return {
        id: String(doc._id),
        jobNumber: String(doc.documentNumber || doc.quote || "").trim() || "—",
        customer: String(doc.companyName || "").trim() || "—",
        customerId: doc.customerId ? String(doc.customerId) : "",
        fields,
      };
    });

    return NextResponse.json({
      ok: true,
      formId,
      searchedFields: filled.map((c) => ({
        key: `${c.blockId}.${c.fieldKey}`,
        label: c.label,
        pattern: c.pattern,
      })),
      rows,
      truncated: docs.length >= MAX_RESULTS,
      limit: MAX_RESULTS,
    });
  } catch (err) {
    console.error("Master data search error:", err);
    return NextResponse.json({ error: err.message || "Search failed" }, { status: 500 });
  }
}
