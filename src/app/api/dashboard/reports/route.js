import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Customer from "@/models/Customer";
import Motor from "@/models/Motor";
import Quote from "@/models/Quote";
import WorkOrder from "@/models/WorkOrder";
import Invoice from "@/models/Invoice";
import PurchaseOrder from "@/models/PurchaseOrder";
import UserSettings from "@/models/UserSettings";
import Vendor from "@/models/Vendor";
import Employee from "@/models/Employee";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { fetchLeadsForShopUser } from "@/lib/dashboard-leads-scope";
import {
  invoiceLineTotal,
  invoiceTotalPaid,
  invoiceBalance,
  daysOutstanding,
} from "@/lib/invoice-amounts";
import { mergeUserSettings } from "@/lib/user-settings";
import {
  graceDaysFromAccountsPaymentTermsSlug,
  isOpenInvoiceOverdueForTerms,
} from "@/lib/accounts-payment-terms";
import { accountsPaymentTermsLabel } from "@/lib/accounts-display";
import { normalizeInvoiceStatusSlug } from "@/lib/invoice-status";
import {
  poLineOrderTotal,
  sumVendorInvoiced,
  sumVendorPayments,
  poBalanceDue,
  computePoStatus,
} from "@/lib/po-payable";
import {
  parseReportsRange,
  buildChartBuckets,
  lastNMonthKeys,
  monthKeysMeta,
  bucketIndexForTime,
  docInRange,
} from "@/lib/dashboard-period";

function quoteDollarTotal(q) {
  const l = parseFloat(q.laborTotal || 0);
  const p = parseFloat(q.partsTotal || 0);
  if (Number.isFinite(l) || Number.isFinite(p)) {
    return (Number.isFinite(l) ? l : 0) + (Number.isFinite(p) ? p : 0);
  }
  let s = 0;
  for (const row of q.scopeLines || []) {
    const v = parseFloat(row?.price);
    if (Number.isFinite(v)) s += v;
  }
  for (const row of q.partsLines || []) {
    const qn = parseFloat(row?.qty ?? 1);
    const pr = parseFloat(row?.price ?? 0);
    if (Number.isFinite(qn) && Number.isFinite(pr)) s += qn * pr;
  }
  return Math.round(s * 100) / 100;
}

function initSeries(meta, withValue = false, withBilled = false) {
  return meta.map((m) => {
    const o = { key: m.key, label: m.label, month: m.key, count: 0 };
    if (withValue) o.value = 0;
    if (withBilled) o.billed = 0;
    return o;
  });
}

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = user.email.trim().toLowerCase();
    await connectDB();

    const range = parseReportsRange(request.nextUrl.searchParams);
    const { allTime, fromMs, toMs } = range;

    const [
      leadsAll,
      customersAll,
      motorsAll,
      quotesAll,
      workOrdersAll,
      invoicesAll,
      purchaseOrdersAll,
      vendorsAll,
      employeesAll,
      userSettingsDoc,
      openReceivableInvoices,
    ] = await Promise.all([
      fetchLeadsForShopUser(user.email),
      Customer.find({ createdByEmail: email }).lean(),
      Motor.find({ createdByEmail: email }).lean(),
      Quote.find({ createdByEmail: email }).lean(),
      WorkOrder.find({ createdByEmail: email }).lean(),
      Invoice.find({ createdByEmail: email }).lean(),
      PurchaseOrder.find({ createdByEmail: email }).lean(),
      Vendor.find({ createdByEmail: email }).lean(),
      Employee.find({ createdByEmail: email }).lean(),
      UserSettings.findOne({ ownerEmail: email }).lean(),
      Invoice.find({
        createdByEmail: email,
        status: { $in: ["sent", "partial_paid"] },
      }).lean(),
    ]);

    const mergedSettings = mergeUserSettings(userSettingsDoc?.settings);
    const arTermsSlug = mergedSettings.accountsPaymentTerms || "net30";
    const overdueGraceDays = graceDaysFromAccountsPaymentTermsSlug(arTermsSlug);
    const overdueTermsLabel = accountsPaymentTermsLabel(arTermsSlug);
    let overdueOpenCount = 0;
    for (const inv of openReceivableInvoices) {
      if (invoiceBalance(inv) <= 0.009) continue;
      const d = daysOutstanding(inv.date);
      if (isOpenInvoiceOverdueForTerms(d, arTermsSlug)) overdueOpenCount++;
    }

    const leads = allTime ? leadsAll : leadsAll.filter((d) => docInRange(d, fromMs, toMs));
    const customers = allTime ? customersAll : customersAll.filter((d) => docInRange(d, fromMs, toMs));
    const motors = allTime ? motorsAll : motorsAll.filter((d) => docInRange(d, fromMs, toMs));
    const quotes = allTime ? quotesAll : quotesAll.filter((d) => docInRange(d, fromMs, toMs));
    const workOrders = allTime ? workOrdersAll : workOrdersAll.filter((d) => docInRange(d, fromMs, toMs));
    const invoices = allTime ? invoicesAll : invoicesAll.filter((d) => docInRange(d, fromMs, toMs));
    const purchaseOrders = allTime
      ? purchaseOrdersAll
      : purchaseOrdersAll.filter((d) => docInRange(d, fromMs, toMs));
    const vendors = allTime ? vendorsAll : vendorsAll.filter((d) => docInRange(d, fromMs, toMs));
    const employees = allTime ? employeesAll : employeesAll.filter((d) => docInRange(d, fromMs, toMs));

    let chartMeta;
    let bucketType;
    if (allTime) {
      const keys = lastNMonthKeys(6);
      chartMeta = monthKeysMeta(keys);
      bucketType = "month";
    } else {
      const b = buildChartBuckets(fromMs, toMs);
      chartMeta = b.meta;
      bucketType = b.bucket;
    }

    const leadByStatus = { new: 0, contacted: 0, quoted: 0, won: 0, lost: 0 };
    const leadBySource = { website: 0, admin_assigned: 0, manual: 0 };
    const leadSeries = initSeries(chartMeta);
    for (const l of leads) {
      const st = (l.status || "new").toLowerCase();
      if (leadByStatus[st] !== undefined) leadByStatus[st]++;
      let src = l.leadSource;
      if (!src) {
        src =
          l.createdByEmail?.toLowerCase() === email
            ? "manual"
            : l.sourceListingId
              ? "website"
              : "admin_assigned";
      }
      if (leadBySource[src] !== undefined) leadBySource[src]++;
      const t = new Date(l.createdAt).getTime();
      const bi = bucketIndexForTime(t, chartMeta, bucketType);
      if (bi >= 0) leadSeries[bi].count++;
    }

    const motorsPerCustomer = {};
    for (const m of motors) {
      const cid = String(m.customerId || "");
      if (!cid) continue;
      motorsPerCustomer[cid] = (motorsPerCustomer[cid] || 0) + 1;
    }
    const custMap = Object.fromEntries(
      customersAll.map((c) => [String(c._id), c.companyName || c.primaryContactName || "Customer"])
    );
    const topCustomersByMotors = Object.entries(motorsPerCustomer)
      .map(([id, n]) => ({ id, name: custMap[id] || id, motorCount: n }))
      .sort((a, b) => b.motorCount - a.motorCount)
      .slice(0, 10);

    const quoteByStatus = { draft: 0, sent: 0, approved: 0, rejected: 0, rnr: 0, other: 0 };
    let quotePipelineValue = 0;
    let quoteApprovedValue = 0;
    const quoteSeries = initSeries(chartMeta, true);
    const quotesPerCustomer = {};
    for (const q of quotes) {
      const st = (q.status || "draft").toLowerCase().trim();
      if (quoteByStatus[st] !== undefined) quoteByStatus[st]++;
      else quoteByStatus.other++;
      const val = quoteDollarTotal(q);
      if (st !== "rejected" && st !== "rnr") quotePipelineValue += val;
      if (st === "approved") quoteApprovedValue += val;
      const t = new Date(q.createdAt).getTime();
      const bi = bucketIndexForTime(t, chartMeta, bucketType);
      if (bi >= 0) {
        quoteSeries[bi].count++;
        quoteSeries[bi].value += val;
      }
      const cid = String(q.customerId || "");
      if (cid) quotesPerCustomer[cid] = (quotesPerCustomer[cid] || 0) + 1;
    }
    const topCustomersByQuotes = Object.entries(quotesPerCustomer)
      .map(([id, n]) => ({ id, name: custMap[id] || id, quoteCount: n }))
      .sort((a, b) => b.quoteCount - a.quoteCount)
      .slice(0, 10);

    const woByStatus = {};
    const woSeries = initSeries(chartMeta);
    for (const w of workOrders) {
      const st = (w.status || "Unknown").trim() || "Unknown";
      woByStatus[st] = (woByStatus[st] || 0) + 1;
      const t = new Date(w.createdAt).getTime();
      const bi = bucketIndexForTime(t, chartMeta, bucketType);
      if (bi >= 0) woSeries[bi].count++;
    }
    const woByStatusSorted = Object.entries(woByStatus)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    let invoiceBilled = 0;
    let invoiceCollected = 0;
    let invoiceOutstanding = 0;
    const invByStatus = { draft: 0, sent: 0, partial_paid: 0, fully_paid: 0 };
    const invSeries = initSeries(chartMeta, false, true);
    const revenuePerCustomer = {};
    for (const inv of invoices) {
      const slug = normalizeInvoiceStatusSlug(inv.status);
      if (invByStatus[slug] !== undefined) invByStatus[slug]++;
      const total = invoiceLineTotal(inv);
      const paid = invoiceTotalPaid(inv);
      const bal = invoiceBalance(inv);
      invoiceBilled += total;
      invoiceCollected += paid;
      invoiceOutstanding += bal;
      const t = new Date(inv.createdAt).getTime();
      const bi = bucketIndexForTime(t, chartMeta, bucketType);
      if (bi >= 0) {
        invSeries[bi].count++;
        invSeries[bi].billed += total;
      }
      const cid = String(inv.customerId || "");
      if (cid) revenuePerCustomer[cid] = (revenuePerCustomer[cid] || 0) + total;
    }
    const topCustomersByInvoiceValue = Object.entries(revenuePerCustomer)
      .map(([id, billed]) => ({ id, name: custMap[id] || id, billed }))
      .sort((a, b) => b.billed - a.billed)
      .slice(0, 10);

    let poOrderTotal = 0;
    let poVendorInvoiced = 0;
    let poVendorPaid = 0;
    let totalPoBalanceDue = 0;
    const poByStatus = {};
    const vendorSpend = {};
    const vendorMap = Object.fromEntries(vendorsAll.map((v) => [String(v._id), v.name || "Vendor"]));
    for (const po of purchaseOrders) {
      const order = poLineOrderTotal(po);
      const inv = sumVendorInvoiced(po);
      const paid = sumVendorPayments(po);
      const bal = poBalanceDue(po);
      const st = computePoStatus(order, inv, paid);
      poByStatus[st] = (poByStatus[st] || 0) + 1;
      poOrderTotal += order;
      poVendorInvoiced += inv;
      poVendorPaid += paid;
      totalPoBalanceDue += bal;
      const vid = String(po.vendorId || "");
      if (vid) vendorSpend[vid] = (vendorSpend[vid] || 0) + order;
    }
    const topVendorsByPOValue = Object.entries(vendorSpend)
      .map(([id, spend]) => ({ id, name: vendorMap[id] || id, orderTotal: spend }))
      .sort((a, b) => b.orderTotal - a.orderTotal)
      .slice(0, 10);

    const quoteSeriesOut = quoteSeries.map((r) => ({
      ...r,
      value: Math.round((r.value || 0) * 100) / 100,
    }));
    const invSeriesOut = invSeries.map((r) => ({
      ...r,
      billed: Math.round((r.billed || 0) * 100) / 100,
    }));

    const periodLabel = allTime
      ? "All time"
      : `${new Date(fromMs).toLocaleDateString()} – ${new Date(toMs).toLocaleDateString()}`;

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      period: {
        allTime,
        from: allTime ? null : new Date(fromMs).toISOString(),
        to: allTime ? null : new Date(toMs).toISOString(),
        label: periodLabel,
        bucket: bucketType,
      },
      summary: {
        leads: leads.length,
        customers: customers.length,
        motors: motors.length,
        quotes: quotes.length,
        workOrders: workOrders.length,
        invoices: invoices.length,
        purchaseOrders: purchaseOrders.length,
        vendors: vendors.length,
        employees: employees.length,
      },
      leads: {
        byStatus: leadByStatus,
        bySource: leadBySource,
        byMonth: leadSeries,
        series: leadSeries,
      },
      customers: {
        topByMotors: topCustomersByMotors,
        avgMotorsPerCustomer:
          Object.keys(motorsPerCustomer).length > 0
            ? Math.round((motors.length / Object.keys(motorsPerCustomer).length) * 10) / 10
            : 0,
      },
      quotes: {
        byStatus: quoteByStatus,
        pipelineValueExRejected: Math.round(quotePipelineValue * 100) / 100,
        approvedValue: Math.round(quoteApprovedValue * 100) / 100,
        byMonth: quoteSeriesOut,
        series: quoteSeriesOut,
        topCustomersByQuotes,
      },
      workOrders: {
        total: workOrders.length,
        byStatus: woByStatusSorted,
        byMonth: woSeries,
        series: woSeries,
      },
      invoices: {
        byStatus: invByStatus,
        totalBilled: Math.round(invoiceBilled * 100) / 100,
        totalCollected: Math.round(invoiceCollected * 100) / 100,
        outstandingAR: Math.round(invoiceOutstanding * 100) / 100,
        overdueOpenCount,
        overdueGraceDays,
        overdueTermsLabel,
        byMonth: invSeriesOut,
        series: invSeriesOut,
        topCustomersByBilled: topCustomersByInvoiceValue.map((r) => ({
          ...r,
          billed: Math.round(r.billed * 100) / 100,
        })),
      },
      purchaseOrders: {
        byStatus: Object.entries(poByStatus)
          .map(([status, count]) => ({ status, count }))
          .sort((a, b) => b.count - a.count),
        totalOrderValue: Math.round(poOrderTotal * 100) / 100,
        vendorInvoiced: Math.round(poVendorInvoiced * 100) / 100,
        vendorPaid: Math.round(poVendorPaid * 100) / 100,
        balanceDueVendors: Math.round(totalPoBalanceDue * 100) / 100,
        topVendorsByPOValue: topVendorsByPOValue.map((r) => ({
          ...r,
          orderTotal: Math.round(r.orderTotal * 100) / 100,
        })),
      },
    });
  } catch (err) {
    console.error("Reports GET:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
