import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import SimpleServiceProposal from "@/models/SimpleServiceProposal";
import Customer from "@/models/Customer";
import { MASTER_DATA_SEARCH_FORMS } from "@/lib/simple-datasheet-form";
import {
  buildMasterDataSearchAndClauses,
  collectCustomerSearchCriteria,
  collectFilledMasterDataCriteria,
  getDottedValue,
} from "@/lib/master-data-search";

const MAX_RESULTS = 200;

async function searchByCustomer(email, criteria) {
  const filled = collectCustomerSearchCriteria(criteria);
  if (filled.length === 0) {
    return { error: "Enter at least one field. Use * for wildcards (e.g. *text* or text*)." };
  }

  await connectDB();

  const companyCriterion = filled.find((f) => f.fieldKey === "companyName");
  const contactCriterion = filled.find((f) => f.fieldKey === "primaryContactName");

  /** @type {Record<string, unknown>[]} */
  const andClauses = [];

  if (companyCriterion) {
    andClauses.push({
      companyName: { $regex: companyCriterion.regexSource, $options: "i" },
    });
  }

  /** @type {Map<string, { companyName: string, primaryContactName: string }>} */
  let customerById = new Map();

  if (contactCriterion) {
    const rx = { $regex: contactCriterion.regexSource, $options: "i" };
    const customers = await Customer.find({
      createdByEmail: email,
      $or: [{ primaryContactName: rx }, { "additionalContacts.contactName": rx }],
    })
      .select({ companyName: 1, primaryContactName: 1 })
      .limit(500)
      .lean();

    const ids = customers.map((c) => String(c._id));
    if (!ids.length) {
      return {
        filled,
        rows: [],
        truncated: false,
      };
    }
    andClauses.push({ customerId: { $in: ids } });
    customerById = new Map(
      customers.map((c) => [
        String(c._id),
        {
          companyName: String(c.companyName || "").trim(),
          primaryContactName: String(c.primaryContactName || "").trim(),
        },
      ])
    );
  }

  const docs = await SimpleServiceProposal.find({
    createdByEmail: email,
    ...(andClauses.length ? { $and: andClauses } : {}),
  })
    .select({
      documentNumber: 1,
      quote: 1,
      companyName: 1,
      customerId: 1,
    })
    .sort({ updatedAt: -1 })
    .limit(MAX_RESULTS)
    .lean();

  const missingCustomerIds = [
    ...new Set(
      docs
        .map((d) => String(d.customerId || "").trim())
        .filter((id) => id && !customerById.has(id))
    ),
  ];
  if (missingCustomerIds.length) {
    const extra = await Customer.find({
      createdByEmail: email,
      _id: { $in: missingCustomerIds },
    })
      .select({ companyName: 1, primaryContactName: 1 })
      .lean();
    for (const c of extra) {
      customerById.set(String(c._id), {
        companyName: String(c.companyName || "").trim(),
        primaryContactName: String(c.primaryContactName || "").trim(),
      });
    }
  }

  const rows = docs.map((doc) => {
    const cid = String(doc.customerId || "").trim();
    const cust = cid ? customerById.get(cid) : null;
    return {
      id: String(doc._id),
      jobNumber: String(doc.documentNumber || doc.quote || "").trim() || "—",
      customer:
        String(doc.companyName || "").trim() ||
        cust?.companyName ||
        "—",
      customerId: cid,
      contactName: cust?.primaryContactName || "—",
      fields: {},
    };
  });

  return {
    filled,
    rows,
    truncated: docs.length >= MAX_RESULTS,
  };
}

/**
 * POST body:
 *  - formId: "ac" | "dc" | "armature" | "customer"
 *  - criteria: datasheet blocks OR { companyName, primaryContactName } for customer
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
        { error: "Invalid form. Use ac, dc, armature, or customer." },
        { status: 400 }
      );
    }

    const criteria =
      body.criteria && typeof body.criteria === "object" && !Array.isArray(body.criteria)
        ? body.criteria
        : {};

    const email = user.email.trim().toLowerCase();

    if (form.searchType === "customer") {
      const result = await searchByCustomer(email, criteria);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({
        ok: true,
        formId,
        searchType: "customer",
        searchedFields: (result.filled || []).map((c) => ({
          key: c.fieldKey,
          label: c.label,
          pattern: c.pattern,
        })),
        rows: result.rows || [],
        truncated: Boolean(result.truncated),
        limit: MAX_RESULTS,
      });
    }

    const filled = collectFilledMasterDataCriteria(formId, criteria);
    if (filled.length === 0) {
      return NextResponse.json(
        { error: "Enter at least one search field. Use * for wildcards (e.g. *text* or text*)." },
        { status: 400 }
      );
    }

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
