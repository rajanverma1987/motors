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
import {
  INVOICE_FILTER_AMOUNT_RECEIVABLE,
  INVOICE_FILTER_TAX_COLLECTED,
  INVOICE_FILTER_TAX_TO_BE_COLLECTED,
  INVOICE_FILTER_TAX_TO_BE_COLLECTED_LEGACY,
} from "@/lib/invoice-tax-collected";

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

  if (f === INVOICE_FILTER_AMOUNT_RECEIVABLE) {
    return mongoNotFullyPaidClause(mergedSettings);
  }
  if (
    f === INVOICE_FILTER_TAX_TO_BE_COLLECTED ||
    f === INVOICE_FILTER_TAX_TO_BE_COLLECTED_LEGACY
  ) {
    // Unpaid / not fully paid invoices that still have sales tax to collect.
    return andMongoClauses(mongoNotFullyPaidClause(mergedSettings), mongoPositiveTaxClause());
  }
  if (f === INVOICE_FILTER_TAX_COLLECTED) {
    // Fully paid invoices where sales tax was collected.
    return andMongoClauses(mongoFullyPaidClause(mergedSettings), mongoPositiveTaxClause());
  }

  if (!isInvoices && isQuoteStatusFilterGroupKey(f)) {
    const specs = buildQuoteStatusFilterCardSpecs(mergedSettings);
    const spec = specs.find((c) => c.key === f);
    if (!spec?.memberValues?.length) return { status: "__none__" };
    const members = spec.memberValues.map((v) => String(v).toLowerCase());
    return {
      $or: [
        ...members.map((m) => ({ status: { $regex: `^${escapeRx(m)}$`, $options: "i" } })),
        ...members.map((m) => ({
          status: { $regex: `^invoice:${escapeRx(m)}$`, $options: "i" },
        })),
      ],
    };
  }

  const bare = f.replace(/^invoice:/i, "").toLowerCase();
  if (!bare) return null;
  return {
    $or: [
      { status: { $regex: `^${escapeRx(bare)}$`, $options: "i" } },
      { status: { $regex: `^invoice:${escapeRx(bare)}$`, $options: "i" } },
    ],
  };
}

function escapeRx(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fullyPaidBareSlugs(mergedSettings) {
  const slugs = invoiceStatusAllowedSlugs(mergedSettings);
  return slugs.filter((s) => {
    const bare = String(s || "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");
    return bare === "fully_paid" || bare.endsWith("_fully_paid");
  });
}

/** taxCollected may be number or numeric string on older rows. */
export function mongoPositiveTaxClause() {
  return {
    $expr: {
      $gt: [
        {
          $convert: {
            input: "$taxCollected",
            to: "double",
            onError: 0,
            onNull: 0,
          },
        },
        0.005,
      ],
    },
  };
}

export function mongoFullyPaidClause(mergedSettings) {
  const paid = fullyPaidBareSlugs(mergedSettings);
  const slugs = paid.length ? paid : ["fully_paid"];
  return {
    $or: slugs.flatMap((m) => {
      const bare = String(m)
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_");
      // Match bare slug, spaced label, and invoice:-prefixed forms (any case).
      const flexible = escapeRx(bare).replace(/_/g, "[_\\s-]+");
      return [
        { status: { $regex: `^${flexible}$`, $options: "i" } },
        { status: { $regex: `^invoice:${flexible}$`, $options: "i" } },
      ];
    }),
  };
}

export function mongoNotFullyPaidClause(mergedSettings) {
  return { $nor: [mongoFullyPaidClause(mergedSettings)] };
}

/**
 * Aggregation stages: numeric tax/total + fully-paid flag for invoice finance cards.
 */
export function invoiceFinanceAddFieldsStages() {
  return [
    {
      $addFields: {
        _spTax: {
          $convert: { input: "$taxCollected", to: "double", onError: 0, onNull: 0 },
        },
        _spTotal: {
          $convert: { input: "$total", to: "double", onError: 0, onNull: 0 },
        },
        _spFullyPaid: {
          $regexMatch: {
            input: { $toLower: { $ifNull: ["$status", ""] } },
            regex: "(^invoice:)?(.*[_\\s-])?fully[_\\s-]?paid$",
          },
        },
      },
    },
  ];
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
