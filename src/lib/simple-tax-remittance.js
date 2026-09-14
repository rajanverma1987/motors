import SimpleServiceProposal from "@/models/SimpleServiceProposal";
import {
  andMongoClauses,
  invoiceFinanceAddFieldsStages,
  mongoInvoiceKindClause,
  mongoSpDateRangeClause,
} from "@/lib/simple-service-proposal-list-query";

function round2(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function toYmd(value) {
  if (!value) return "";
  if (typeof value === "string") {
    const s = value.trim().slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return "";
}

function mapUnpaidRow(doc) {
  return {
    id: String(doc._id),
    documentNumber: String(doc.documentNumber || doc.quote || "").trim(),
    companyName: String(doc.companyName || "").trim(),
    date: toYmd(doc.date) || toYmd(doc.dateCreated) || toYmd(doc.createdAt),
    taxCollected: round2(doc._spTax ?? doc.taxCollected),
    total: round2(doc._spTotal ?? doc.total),
  };
}

function mapPaidRow(doc) {
  return {
    id: String(doc._id),
    documentNumber: String(doc.documentNumber || doc.quote || "").trim(),
    companyName: String(doc.companyName || "").trim(),
    date: toYmd(doc.date) || toYmd(doc.dateCreated) || toYmd(doc.createdAt),
    taxCollected: round2(doc.taxCollected),
    taxRemittancePaidDate: String(doc.taxRemittancePaidDate || "").trim().slice(0, 10),
    taxRemittancePeriod: String(doc.taxRemittancePeriod || "").trim(),
    taxRemittanceTaxType: String(doc.taxRemittanceTaxType || "").trim(),
    taxRemittancePaymentId: String(doc.taxRemittancePaymentId || "").trim(),
    taxRemittancePaidAmount: round2(doc.taxRemittancePaidAmount),
  };
}

/**
 * Fully paid Simple invoices with tax collected, not yet remitted to government.
 * @param {string} email
 * @param {object} mergedSettings
 * @param {string} fromYmd
 * @param {string} toYmd
 */
export async function listUnpaidTaxRemittanceJobs(email, mergedSettings, fromYmd, toYmd) {
  const baseMatch = andMongoClauses(
    { createdByEmail: email },
    mongoInvoiceKindClause(mergedSettings),
    mongoSpDateRangeClause(fromYmd, toYmd),
    {
      $or: [{ taxRemitted: { $exists: false } }, { taxRemitted: false }, { taxRemitted: null }],
    }
  );

  const rows = await SimpleServiceProposal.aggregate([
    { $match: baseMatch },
    ...invoiceFinanceAddFieldsStages(),
    { $match: { _spFullyPaid: true, _spTax: { $gt: 0.005 } } },
    { $sort: { dateCreated: -1, createdAt: -1 } },
  ]);

  const mapped = (rows || []).map(mapUnpaidRow);
  const taxTotal = round2(mapped.reduce((sum, r) => sum + (Number(r.taxCollected) || 0), 0));
  return {
    rows: mapped,
    summary: { count: mapped.length, taxTotal },
  };
}

/**
 * Simple invoices already remitted. Uses the same invoice date window as Unpaid
 * so remitting a filing period keeps those jobs visible on Paid.
 * @param {string} email
 * @param {object} mergedSettings
 * @param {string} fromYmd
 * @param {string} toYmd
 */
export async function listPaidTaxRemittanceJobs(email, mergedSettings, fromYmd, toYmd) {
  const match = andMongoClauses(
    { createdByEmail: email },
    mongoInvoiceKindClause(mergedSettings),
    { taxRemitted: true },
    mongoSpDateRangeClause(fromYmd, toYmd)
  );

  const docs = await SimpleServiceProposal.find(match)
    .sort({ taxRemittancePaidDate: -1, updatedAt: -1 })
    .lean();

  const mapped = (docs || []).map(mapPaidRow);
  const taxTotal = round2(mapped.reduce((sum, r) => sum + (Number(r.taxCollected) || 0), 0));
  return {
    rows: mapped,
    summary: { count: mapped.length, taxTotal },
  };
}
