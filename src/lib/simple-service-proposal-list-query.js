/**
 * Server-side list query helpers for Simple service proposals / invoices.
 */

import UserSettings from "@/models/UserSettings";
import { mergeUserSettings } from "@/lib/user-settings";
import {
  buildQuoteStatusFilterCardSpecs,
  invoiceStatusAllowedSlugs,
  isQuoteStatusFilterGroupKey,
  quoteStatusSelectOptionsFromMerged,
  quoteStatusSortOrderForValue,
} from "@/lib/dropdown-catalog";
import { mongoCalendarDateRange } from "@/lib/format-date";
import { RECORD_TYPE_INVOICE } from "@/lib/simple-service-proposal-form";

const SORT_FIELD_MAP = {
  quote: "documentNumber",
  documentNumber: "documentNumber",
  date: "dateCreated",
  dateCreated: "dateCreated",
  companyName: "companyName",
  phone: "customerPhone",
  email: "customerEmail",
  quotedBy: "quotedBy",
  quoteType: "quoteType",
  total: "total",
  taxCollected: "taxCollected",
  submitDate: "proposalSubmitDate",
  acceptDate: "proposalAcceptedDate",
  invoiceSubmitDate: "invoiceSubmitDate",
  invoicePaidDate: "invoicePaidDate",
  status: "status",
  jobStatus: "jobStatus",
  notes: "internalNotes",
  updatedAt: "updatedAt",
  createdAt: "createdAt",
};

export async function loadMergedSettingsForEmail(email) {
  const settingsDoc = await UserSettings.findOne({ ownerEmail: email }).lean();
  return mergeUserSettings(settingsDoc?.settings);
}

export function simpleSpSortField(sortBy) {
  const key = String(sortBy || "").trim();
  return SORT_FIELD_MAP[key] || "updatedAt";
}

export function invoiceOnlyStatusSlugs(mergedSettings) {
  const invoice = new Set(invoiceStatusAllowedSlugs(mergedSettings));
  const quote = new Set(
    quoteStatusSelectOptionsFromMerged(mergedSettings).map((o) =>
      String(o.value || "")
        .trim()
        .toLowerCase()
    )
  );
  return [...invoice].filter((s) => s && !quote.has(s));
}

/** Mongo clause: row belongs on Invoices tab. */
export function mongoInvoiceKindClause(mergedSettings) {
  const only = invoiceOnlyStatusSlugs(mergedSettings);
  const ors = [
    { recordType: RECORD_TYPE_INVOICE },
    { status: { $regex: /^invoice:/i } },
  ];
  if (only.length) ors.push({ status: { $in: only } });
  return { $or: ors };
}

/** Mongo clause: row belongs on Service Proposals tab (not invoice). */
export function mongoProposalKindClause(mergedSettings) {
  return { $nor: [mongoInvoiceKindClause(mergedSettings)] };
}

export function mongoSpDateRangeClause(fromYmd, toYmd) {
  const range = mongoCalendarDateRange(fromYmd, toYmd);
  if (!range) return null;
  return {
    $or: [{ date: range }, { dateCreated: range }],
  };
}

export function andMongoClauses(...parts) {
  const clauses = parts.filter((p) => p && typeof p === "object" && Object.keys(p).length);
  if (!clauses.length) return {};
  if (clauses.length === 1) return clauses[0];
  return { $and: clauses };
}

/**
 * Expand status filter key (slug, invoice:slug, or fg:group) to Mongo status match.
 */
export function mongoStatusFilterClause(statusFilter, mergedSettings, { isInvoices = false } = {}) {
  const f = String(statusFilter || "").trim();
  if (!f) return null;

  if (f === "__amount_receivable__" || f === "__tax_to_collect__") {
    return mongoNotFullyPaidClause(mergedSettings);
  }
  if (f === "__tax_collected__") {
    return mongoFullyPaidClause(mergedSettings);
  }

  if (!isInvoices && isQuoteStatusFilterGroupKey(f)) {
    const specs = buildQuoteStatusFilterCardSpecs(mergedSettings);
    const spec = specs.find((c) => c.key === f);
    if (!spec?.memberValues?.length) return { status: "__none__" };
    const members = spec.memberValues.map((v) => String(v).toLowerCase());
    return {
      $or: [
        { status: { $in: members } },
        ...members.map((m) => ({ status: new RegExp(`^invoice:${escapeRx(m)}$`, "i") })),
      ],
    };
  }

  const bare = f.replace(/^invoice:/i, "").toLowerCase();
  if (!bare) return null;
  return {
    $or: [
      { status: bare },
      { status: f },
      { status: new RegExp(`^invoice:${escapeRx(bare)}$`, "i") },
    ],
  };
}

function escapeRx(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fullyPaidBareSlugs(mergedSettings) {
  const slugs = invoiceStatusAllowedSlugs(mergedSettings);
  return slugs.filter((s) => {
    const bare = s.replace(/[\s-]+/g, "_");
    return bare === "fully_paid" || bare.endsWith("_fully_paid");
  });
}

export function mongoFullyPaidClause(mergedSettings) {
  const paid = fullyPaidBareSlugs(mergedSettings);
  if (!paid.length) {
    return {
      status: { $regex: /fully[_ ]?paid/i },
    };
  }
  return {
    $or: [
      { status: { $in: paid } },
      ...paid.map((m) => ({ status: new RegExp(`^invoice:${escapeRx(m)}$`, "i") })),
    ],
  };
}

export function mongoNotFullyPaidClause(mergedSettings) {
  return { $nor: [mongoFullyPaidClause(mergedSettings)] };
}

/**
 * When sorting by proposal status, use configured sortOrder (in-memory after page fetch is wrong).
 * Build a Mongo aggregation addFields comparator via mapped rank.
 */
export function statusSortRankExpression(mergedSettings) {
  const opts = quoteStatusSelectOptionsFromMerged(mergedSettings);
  const branches = opts.map((o) => {
    const v = String(o.value || "").trim().toLowerCase();
    const rank = quoteStatusSortOrderForValue(mergedSettings, v);
    return { case: { $eq: [{ $toLower: { $ifNull: ["$status", ""] } }, v] }, then: rank };
  });
  return {
    $switch: {
      branches,
      default: Number.MAX_SAFE_INTEGER,
    },
  };
}
