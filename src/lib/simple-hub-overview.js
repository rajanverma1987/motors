import SimpleServiceProposal from "@/models/SimpleServiceProposal";
import SimplePurchaseOrder from "@/models/SimplePurchaseOrder";
import SalesCommission from "@/models/SalesCommission";
import {
  RECORD_TYPE_INVOICE,
  RECORD_TYPE_JOB,
  RECORD_TYPE_RFQ,
} from "@/lib/simple-service-proposal-form";
import {
  agingBucketLabel,
  agingFromDueDate,
  computePoMoney,
  computeSpInvoiceMoney,
  computeSpMoney,
  dayInRange,
  isInvoiceSp,
  resolveDocDay,
  toYmd,
} from "@/lib/simple-reports/helpers";
import { listMonthKeys } from "@/lib/simple-hub-overview-dates";

export { listMonthKeys } from "@/lib/simple-hub-overview-dates";

const FETCH_LIMIT = 20000;
const AGING_ORDER = ["current", "1-30", "31-60", "61-90", "90+", "no-due"];

function monthKeyFromDay(day) {
  const s = String(day || "").slice(0, 7);
  return /^\d{4}-\d{2}$/.test(s) ? s : "";
}

function monthKeyFromDate(value) {
  return monthKeyFromDay(toYmd(value));
}

function emptyMonthMap(monthKeys, fields) {
  /** @type {Record<string, Record<string, number>>} */
  const map = {};
  for (const key of monthKeys) {
    map[key] = { month: key };
    for (const f of fields) map[key][f] = 0;
  }
  return map;
}

function isTerminalJobStatus(status, jobStatus) {
  const s = `${status || ""} ${jobStatus || ""}`.toLowerCase();
  return /closed|cancelled|canceled|delivered|complete|completed|void/.test(s);
}

function bumpStatus(map, label, amount) {
  const key = String(label || "").trim() || "—";
  const prev = map.get(key) || { status: key, count: 0, amount: 0 };
  prev.count += 1;
  prev.amount += Number(amount) || 0;
  map.set(key, prev);
}

function bumpPayment(map, status, amount) {
  const key = String(status || "Unpaid").trim() || "Unpaid";
  const prev = map.get(key) || { status: key, count: 0, amount: 0 };
  prev.count += 1;
  prev.amount += Number(amount) || 0;
  map.set(key, prev);
}

function bumpAging(map, bucket, unpaid) {
  const key = String(bucket || "no-due");
  const prev = map.get(key) || { bucket: key, label: agingBucketLabel(key), count: 0, amount: 0 };
  prev.count += 1;
  prev.amount += Number(unpaid) || 0;
  map.set(key, prev);
}

/**
 * Hub Dashboard overview aggregates for one shop owner.
 * @param {string} ownerEmail
 * @param {{ from?: string, to?: string }} [options]
 */
export async function buildSimpleHubOverview(ownerEmail, options = {}) {
  const email = String(ownerEmail || "").trim().toLowerCase();
  const from = String(options.from || "").trim().slice(0, 10);
  const to = String(options.to || "").trim().slice(0, 10);
  const monthKeys = listMonthKeys(from, to);

  const [proposals, purchaseOrders] = await Promise.all([
    SimpleServiceProposal.find({ createdByEmail: email }).limit(FETCH_LIMIT).lean(),
    SimplePurchaseOrder.find({ createdByEmail: email }).limit(FETCH_LIMIT).lean(),
  ]);

  const simpleQuoteIds = (proposals || []).map((d) => String(d._id));
  const commissions =
    simpleQuoteIds.length === 0
      ? []
      : await SalesCommission.find({
          createdByEmail: email,
          quoteId: { $in: simpleQuoteIds },
        })
          .limit(FETCH_LIMIT)
          .lean();

  const revenueByMonthMap = emptyMonthMap(monthKeys, ["amount"]);
  const cashByMonthMap = emptyMonthMap(monthKeys, ["amount"]);
  const jobsByStatusMap = new Map();
  const invoicesByPaymentMap = new Map();
  const posByPaymentMap = new Map();
  const arAgingMap = new Map();
  const apAgingMap = new Map();
  const commissionsByMonthMap = emptyMonthMap(monthKeys, ["paid", "unpaid"]);
  const commissionsPaidByMonthMap = emptyMonthMap(monthKeys, ["amount"]);

  let revenue = 0;
  let cashReceived = 0;
  let amountReceivable = 0;
  let openJobsCount = 0;
  let unpaidPoAmount = 0;
  let unpaidCommissionAmount = 0;
  let commissionPaidAmount = 0;
  let commissionUnpaidAmount = 0;
  let commissionPaidCount = 0;
  let commissionUnpaidCount = 0;

  for (const doc of proposals || []) {
    const recordType = String(doc.recordType || RECORD_TYPE_RFQ).toUpperCase();

    if (recordType === RECORD_TYPE_JOB || recordType === RECORD_TYPE_RFQ) {
      const day = resolveDocDay(doc, ["dateCreated", "date", "createdAt"]);
      const money = computeSpMoney(doc);
      if (dayInRange(day, from, to)) {
        const label =
          recordType === RECORD_TYPE_JOB
            ? String(doc.jobStatus || doc.status || "Job").trim() || "Job"
            : String(doc.status || "RFQ").trim() || "RFQ";
        bumpStatus(jobsByStatusMap, `${recordType}: ${label}`, money.grandTotal);
      }
      if (recordType === RECORD_TYPE_JOB && !isTerminalJobStatus(doc.status, doc.jobStatus)) {
        openJobsCount += 1;
      }
    }

    if (!isInvoiceSp(doc) && recordType !== RECORD_TYPE_INVOICE) continue;

    const money = computeSpInvoiceMoney(doc);
    const invoiceDay = resolveDocDay(doc, [
      "invoiceSubmitDate",
      "dateCreated",
      "date",
      "createdAt",
    ]);

    if (dayInRange(invoiceDay, from, to)) {
      revenue += money.grandTotal;
      bumpPayment(invoicesByPaymentMap, money.paymentStatus, money.grandTotal);
      const mk = monthKeyFromDay(invoiceDay);
      if (mk && revenueByMonthMap[mk]) {
        revenueByMonthMap[mk].amount += money.grandTotal;
      }
    }

    if (money.unpaid > 0) {
      amountReceivable += money.unpaid;
      const aging = agingFromDueDate(doc.dueDate);
      bumpAging(arAgingMap, aging.bucket, money.unpaid);
    }

    const payments = Array.isArray(doc.payments) ? doc.payments : [];
    if (payments.length > 0) {
      for (const payment of payments) {
        const paidDay = toYmd(payment.date);
        if (!dayInRange(paidDay, from, to)) continue;
        const amt = Number(payment.amount) || 0;
        cashReceived += amt;
        const mk = monthKeyFromDay(paidDay);
        if (mk && cashByMonthMap[mk]) cashByMonthMap[mk].amount += amt;
      }
    } else if (money.isPaid && money.grandTotal > 0) {
      const paidDay =
        toYmd(doc.invoicePaidDate) ||
        resolveDocDay(doc, ["invoicePaidDate", "updatedAt", "createdAt"]);
      if (dayInRange(paidDay, from, to)) {
        cashReceived += money.grandTotal;
        const mk = monthKeyFromDay(paidDay);
        if (mk && cashByMonthMap[mk]) cashByMonthMap[mk].amount += money.grandTotal;
      }
    }
  }

  for (const doc of purchaseOrders || []) {
    const money = computePoMoney(doc);
    const day = resolveDocDay(doc, ["poCutDate", "createdAt"]);
    if (dayInRange(day, from, to)) {
      bumpPayment(posByPaymentMap, money.paymentStatus, money.grandTotal);
    }
    if (money.unpaid > 0) {
      unpaidPoAmount += money.unpaid;
      const aging = agingFromDueDate(doc.dueDate);
      bumpAging(apAgingMap, aging.bucket, money.unpaid);
    }
  }

  for (const doc of commissions || []) {
    const amount = Number(doc.amount) || 0;
    const isPaid = String(doc.status || "unpaid").toLowerCase() === "paid";
    const inCreated = dayInRange(doc.createdAt, from, to);
    const inPaid = dayInRange(doc.paidAt, from, to);
    if (!inCreated && !inPaid) continue;

    if (isPaid) {
      commissionPaidAmount += amount;
      commissionPaidCount += 1;
    } else {
      commissionUnpaidAmount += amount;
      commissionUnpaidCount += 1;
    }

    if (!isPaid) unpaidCommissionAmount += amount;

    if (inCreated) {
      const mk = monthKeyFromDate(doc.createdAt);
      if (mk && commissionsByMonthMap[mk]) {
        if (isPaid) commissionsByMonthMap[mk].paid += amount;
        else commissionsByMonthMap[mk].unpaid += amount;
      }
    }
    if (isPaid && inPaid) {
      const mk = monthKeyFromDate(doc.paidAt);
      if (mk && commissionsPaidByMonthMap[mk]) {
        commissionsPaidByMonthMap[mk].amount += amount;
      }
    }
  }

  // Snapshot unpaid commissions (all unpaid, not only in-range) for KPI clarity
  unpaidCommissionAmount = 0;
  for (const doc of commissions || []) {
    if (String(doc.status || "unpaid").toLowerCase() !== "paid") {
      unpaidCommissionAmount += Number(doc.amount) || 0;
    }
  }

  const sortPayment = (a, b) => {
    const order = { Unpaid: 0, "Partial Paid": 1, Paid: 2 };
    return (order[a.status] ?? 9) - (order[b.status] ?? 9);
  };

  return {
    from: from || monthKeys[0] ? `${monthKeys[0]}-01` : "",
    to: to || (monthKeys.length ? `${monthKeys[monthKeys.length - 1]}-28` : ""),
    monthKeys,
    kpis: {
      revenue: round2(revenue),
      cashReceived: round2(cashReceived),
      amountReceivable: round2(amountReceivable),
      openJobsCount,
      unpaidPoAmount: round2(unpaidPoAmount),
      unpaidCommissionAmount: round2(unpaidCommissionAmount),
    },
    revenueByMonth: monthKeys.map((m) => ({
      month: m,
      amount: round2(revenueByMonthMap[m]?.amount || 0),
    })),
    cashByMonth: monthKeys.map((m) => ({
      month: m,
      amount: round2(cashByMonthMap[m]?.amount || 0),
    })),
    jobsByStatus: [...jobsByStatusMap.values()]
      .map((r) => ({ ...r, amount: round2(r.amount) }))
      .sort((a, b) => b.count - a.count),
    invoicesByPayment: [...invoicesByPaymentMap.values()]
      .map((r) => ({ ...r, amount: round2(r.amount) }))
      .sort(sortPayment),
    posByPayment: [...posByPaymentMap.values()]
      .map((r) => ({ ...r, amount: round2(r.amount) }))
      .sort(sortPayment),
    commissionsByStatus: [
      {
        status: "paid",
        label: "Paid",
        amount: round2(commissionPaidAmount),
        count: commissionPaidCount,
      },
      {
        status: "unpaid",
        label: "Unpaid",
        amount: round2(commissionUnpaidAmount),
        count: commissionUnpaidCount,
      },
    ],
    commissionsByMonth: monthKeys.map((m) => ({
      month: m,
      paid: round2(commissionsByMonthMap[m]?.paid || 0),
      unpaid: round2(commissionsByMonthMap[m]?.unpaid || 0),
    })),
    commissionsPaidByMonth: monthKeys.map((m) => ({
      month: m,
      amount: round2(commissionsPaidByMonthMap[m]?.amount || 0),
    })),
    arAging: AGING_ORDER.map((bucket) => {
      const row = arAgingMap.get(bucket) || {
        bucket,
        label: agingBucketLabel(bucket),
        count: 0,
        amount: 0,
      };
      return { ...row, amount: round2(row.amount) };
    }),
    apAging: AGING_ORDER.map((bucket) => {
      const row = apAgingMap.get(bucket) || {
        bucket,
        label: agingBucketLabel(bucket),
        count: 0,
        amount: 0,
      };
      return { ...row, amount: round2(row.amount) };
    }),
  };
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}
