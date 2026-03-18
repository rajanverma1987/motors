import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { fetchLeadsForShopUser } from "@/lib/dashboard-leads-scope";
import Customer from "@/models/Customer";
import Motor from "@/models/Motor";
import Quote from "@/models/Quote";
import WorkOrder from "@/models/WorkOrder";
import Invoice from "@/models/Invoice";
import Vendor from "@/models/Vendor";
import PurchaseOrder from "@/models/PurchaseOrder";

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesQuery(doc, fields, rx) {
  return fields.some((f) => {
    const v = f.split(".").reduce((o, k) => (o == null ? "" : o[k]), doc);
    return v != null && rx.test(String(v));
  });
}

/** @param {{ type: string, typeLabel: string, id: string, title: string, subtitle?: string, openHref: string, linked?: Array<{ type: string, label: string, title: string, openHref: string }> }} r */
function pushLimited(arr, r, limitPerType, typeKey) {
  const n = arr.filter((x) => x._type === typeKey).length;
  if (n >= limitPerType) return;
  arr.push({ ...r, _type: typeKey });
}

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = user.email.trim().toLowerCase();
    const q = (request.nextUrl.searchParams.get("q") || "").trim();
    if (q.length < 2) {
      return NextResponse.json({ results: [], message: "Type at least 2 characters" });
    }
    if (q.length > 100) {
      return NextResponse.json({ error: "Query too long" }, { status: 400 });
    }

    const rx = new RegExp(escapeRegex(q), "i");
    const LIMIT = 6;

    await connectDB();

    const [
      leadsRaw,
      customers,
      motors,
      quotes,
      workOrders,
      invoices,
      vendors,
      pos,
    ] = await Promise.all([
      fetchLeadsForShopUser(email),
      Customer.find({ createdByEmail: email })
        .sort({ createdAt: -1 })
        .limit(400)
        .lean(),
      Motor.find({ createdByEmail: email })
        .sort({ createdAt: -1 })
        .limit(400)
        .lean(),
      Quote.find({ createdByEmail: email })
        .sort({ createdAt: -1 })
        .limit(400)
        .lean(),
      WorkOrder.find({ createdByEmail: email })
        .sort({ createdAt: -1 })
        .limit(400)
        .lean(),
      Invoice.find({ createdByEmail: email })
        .sort({ createdAt: -1 })
        .limit(400)
        .lean(),
      Vendor.find({ createdByEmail: email })
        .sort({ createdAt: -1 })
        .limit(400)
        .lean(),
      PurchaseOrder.find({ createdByEmail: email })
        .sort({ createdAt: -1 })
        .limit(400)
        .lean(),
    ]);

    const customerMap = Object.fromEntries(
      customers.map((c) => [c._id.toString(), c])
    );
    const vendorMap = Object.fromEntries(vendors.map((v) => [v._id.toString(), v]));
    const quoteMap = Object.fromEntries(quotes.map((qu) => [qu._id.toString(), qu]));

    const raw = [];

    for (const l of leadsRaw) {
      if (
        !matchesQuery(
          l,
          ["name", "email", "phone", "company", "city", "zipCode", "message", "problemDescription", "motorType"],
          rx
        )
      ) {
        continue;
      }
      const id = l._id.toString();
      const linked = [];
      const qDoc = quotes.find((qu) => (qu.leadId || "").toString() === id);
      if (qDoc) {
        linked.push({
          type: "quote",
          label: "Quote",
          title: `RFQ ${qDoc.rfqNumber || qDoc._id}`,
          openHref: `/dashboard/quotes?open=${qDoc._id}`,
        });
      }
      pushLimited(
        raw,
        {
          type: "lead",
          typeLabel: "Lead",
          id,
          title: l.name || l.email || "Lead",
          subtitle: [l.company, l.email, l.phone].filter(Boolean).join(" · ") || undefined,
          openHref: `/dashboard/leads?open=${id}`,
          linked,
        },
        LIMIT,
        "lead"
      );
    }

    for (const c of customers) {
      const id = c._id.toString();
      if (
        !matchesQuery(c, ["companyName", "primaryContactName", "email", "phone", "city", "state", "zipCode"], rx)
      ) {
        continue;
      }
      const custMotors = motors.filter((m) => m.customerId === id).slice(0, 3);
      const custQuotes = quotes.filter((qu) => qu.customerId === id).slice(0, 3);
      const linked = [
        ...custMotors.map((m) => ({
          type: "motor",
          label: "Motor",
          title: [m.manufacturer, m.model, m.serialNumber].filter(Boolean).join(" · ") || `Motor ${m._id}`,
          openHref: `/dashboard/motors?open=${m._id}`,
        })),
        ...custQuotes.map((qu) => ({
          type: "quote",
          label: "Quote",
          title: `RFQ ${qu.rfqNumber || qu._id}`,
          openHref: `/dashboard/quotes?open=${qu._id}`,
        })),
      ];
      pushLimited(
        raw,
        {
          type: "customer",
          typeLabel: "Customer",
          id,
          title: c.companyName || c.primaryContactName || c.email || "Customer",
          subtitle: [c.email, c.phone].filter(Boolean).join(" · ") || undefined,
          openHref: `/dashboard/customers?open=${id}`,
          linked,
        },
        LIMIT,
        "customer"
      );
    }

    for (const m of motors) {
      const id = m._id.toString();
      if (
        !matchesQuery(m, ["serialNumber", "manufacturer", "model", "hp", "voltage", "frameSize", "notes"], rx)
      ) {
        continue;
      }
      const cust = customerMap[m.customerId];
      const linked = [];
      if (cust) {
        linked.push({
          type: "customer",
          label: "Customer",
          title: cust.companyName || cust.primaryContactName || "Customer",
          openHref: `/dashboard/customers?open=${cust._id}`,
        });
      }
      const motorQuotes = quotes.filter((qu) => qu.motorId === id).slice(0, 5);
      for (const qu of motorQuotes) {
        linked.push({
          type: "quote",
          label: "Quote",
          title: `RFQ ${qu.rfqNumber || qu._id}`,
          openHref: `/dashboard/quotes?open=${qu._id}`,
        });
      }
      pushLimited(
        raw,
        {
          type: "motor",
          typeLabel: "Motor",
          id,
          title: [m.manufacturer, m.model, m.serialNumber].filter(Boolean).join(" · ") || `Motor ${id.slice(-6)}`,
          subtitle: cust ? `Owner: ${cust.companyName || cust.primaryContactName}` : undefined,
          openHref: `/dashboard/motors?open=${id}`,
          linked,
        },
        LIMIT,
        "motor"
      );
    }

    for (const qu of quotes) {
      const id = qu._id.toString();
      if (!matchesQuery(qu, ["rfqNumber", "customerPo", "repairScope", "status", "date"], rx)) {
        continue;
      }
      const cust = customerMap[qu.customerId];
      const motor = motors.find((mo) => mo._id.toString() === qu.motorId);
      const linked = [];
      if (cust) {
        linked.push({
          type: "customer",
          label: "Customer",
          title: cust.companyName || cust.primaryContactName || "Customer",
          openHref: `/dashboard/customers?open=${cust._id}`,
        });
      }
      if (motor) {
        linked.push({
          type: "motor",
          label: "Motor",
          title: [motor.manufacturer, motor.model, motor.serialNumber].filter(Boolean).join(" · ") || "Motor",
          openHref: `/dashboard/motors?open=${motor._id}`,
        });
      }
      const wos = workOrders.filter((w) => w.quoteId === id);
      for (const w of wos.slice(0, 5)) {
        linked.push({
          type: "work_order",
          label: "Work order",
          title: w.workOrderNumber || w._id,
          openHref: `/dashboard/work-orders?open=${w._id}`,
        });
      }
      const invs = invoices.filter((inv) => inv.quoteId === id);
      for (const inv of invs.slice(0, 5)) {
        linked.push({
          type: "invoice",
          label: "Invoice",
          title: inv.invoiceNumber || inv._id,
          openHref: `/dashboard/invoices?open=${inv._id}`,
        });
      }
      if (qu.leadId) {
        linked.push({
          type: "lead",
          label: "Lead",
          title: `Lead ${qu.leadId}`,
          openHref: `/dashboard/leads?open=${qu.leadId}`,
        });
      }
      const poJob = pos.filter((p) => p.type === "job" && p.quoteId === id).slice(0, 3);
      for (const p of poJob) {
        linked.push({
          type: "purchase_order",
          label: "Purchase order",
          title: p.poNumber || p._id,
          openHref: `/dashboard/purchase-orders?open=${p._id}`,
        });
      }
      pushLimited(
        raw,
        {
          type: "quote",
          typeLabel: "Quote",
          id,
          title: `RFQ ${qu.rfqNumber || id}`,
          subtitle: [qu.status, qu.date].filter(Boolean).join(" · ") || undefined,
          openHref: `/dashboard/quotes?open=${id}`,
          linked,
        },
        LIMIT,
        "quote"
      );
    }

    for (const w of workOrders) {
      const id = w._id.toString();
      if (!matchesQuery(w, ["workOrderNumber", "quoteRfqNumber", "companyName", "status", "date"], rx)) {
        continue;
      }
      const linked = [];
      const cust = customerMap[w.customerId];
      if (cust) {
        linked.push({
          type: "customer",
          label: "Customer",
          title: cust.companyName || cust.primaryContactName || "Customer",
          openHref: `/dashboard/customers?open=${cust._id}`,
        });
      }
      const qu = quoteMap[w.quoteId];
      if (qu) {
        linked.push({
          type: "quote",
          label: "Quote",
          title: `RFQ ${qu.rfqNumber || w.quoteId}`,
          openHref: `/dashboard/quotes?open=${qu._id}`,
        });
      }
      const motor = motors.find((mo) => mo._id.toString() === w.motorId);
      if (motor) {
        linked.push({
          type: "motor",
          label: "Motor",
          title: [motor.manufacturer, motor.model, motor.serialNumber].filter(Boolean).join(" · ") || "Motor",
          openHref: `/dashboard/motors?open=${motor._id}`,
        });
      }
      pushLimited(
        raw,
        {
          type: "work_order",
          typeLabel: "Work order",
          id,
          title: w.workOrderNumber || id,
          subtitle: [w.quoteRfqNumber, w.status].filter(Boolean).join(" · ") || undefined,
          openHref: `/dashboard/work-orders?open=${id}`,
          linked,
        },
        LIMIT,
        "work_order"
      );
    }

    for (const inv of invoices) {
      const id = inv._id.toString();
      if (!matchesQuery(inv, ["invoiceNumber", "rfqNumber", "status", "date"], rx)) {
        continue;
      }
      const linked = [];
      const cust = customerMap[inv.customerId];
      if (cust) {
        linked.push({
          type: "customer",
          label: "Customer",
          title: cust.companyName || cust.primaryContactName || "Customer",
          openHref: `/dashboard/customers?open=${cust._id}`,
        });
      }
      const qu = quoteMap[inv.quoteId];
      if (qu) {
        linked.push({
          type: "quote",
          label: "Quote",
          title: `RFQ ${qu.rfqNumber || inv.quoteId}`,
          openHref: `/dashboard/quotes?open=${qu._id}`,
        });
      }
      const motor = motors.find((mo) => mo._id.toString() === inv.motorId);
      if (motor) {
        linked.push({
          type: "motor",
          label: "Motor",
          title: [motor.manufacturer, motor.model].filter(Boolean).join(" · ") || "Motor",
          openHref: `/dashboard/motors?open=${motor._id}`,
        });
      }
      pushLimited(
        raw,
        {
          type: "invoice",
          typeLabel: "Invoice",
          id,
          title: inv.invoiceNumber || id,
          subtitle: [inv.status, inv.date].filter(Boolean).join(" · ") || undefined,
          openHref: `/dashboard/invoices?open=${id}`,
          linked,
        },
        LIMIT,
        "invoice"
      );
    }

    for (const v of vendors) {
      const id = v._id.toString();
      if (!matchesQuery(v, ["name", "contactName", "email", "phone", "city"], rx)) {
        continue;
      }
      const vendorPos = pos.filter((p) => p.vendorId === id).slice(0, 5);
      const linked = vendorPos.map((p) => ({
        type: "purchase_order",
        label: "Purchase order",
        title: p.poNumber || p._id,
        openHref: `/dashboard/purchase-orders?open=${p._id}`,
      }));
      pushLimited(
        raw,
        {
          type: "vendor",
          typeLabel: "Vendor",
          id,
          title: v.name || id,
          subtitle: [v.email, v.phone].filter(Boolean).join(" · ") || undefined,
          openHref: `/dashboard/vendors?open=${id}`,
          linked,
        },
        LIMIT,
        "vendor"
      );
    }

    for (const p of pos) {
      const id = p._id.toString();
      if (!matchesQuery(p, ["poNumber", "notes"], rx)) {
        continue;
      }
      const vend = vendorMap[p.vendorId];
      const linked = [];
      if (vend) {
        linked.push({
          type: "vendor",
          label: "Vendor",
          title: vend.name || "Vendor",
          openHref: `/dashboard/vendors?open=${vend._id}`,
        });
      }
      if (p.type === "job" && p.quoteId) {
        const qu = quoteMap[p.quoteId];
        linked.push({
          type: "quote",
          label: "Quote",
          title: qu ? `RFQ ${qu.rfqNumber}` : `Quote ${p.quoteId}`,
          openHref: `/dashboard/quotes?open=${p.quoteId}`,
        });
      }
      pushLimited(
        raw,
        {
          type: "purchase_order",
          typeLabel: "Purchase order",
          id,
          title: p.poNumber || id,
          subtitle: vend ? vend.name : undefined,
          openHref: `/dashboard/purchase-orders?open=${id}`,
          linked,
        },
        LIMIT,
        "purchase_order"
      );
    }

    const order = [
      "lead",
      "customer",
      "motor",
      "quote",
      "work_order",
      "invoice",
      "vendor",
      "purchase_order",
    ];
    raw.sort((a, b) => {
      const ia = order.indexOf(a._type);
      const ib = order.indexOf(b._type);
      if (ia !== ib) return ia - ib;
      return 0;
    });

    const results = raw.map(({ _type, ...rest }) => rest);
    return NextResponse.json({ results });
  } catch (err) {
    console.error("Dashboard search:", err);
    return NextResponse.json({ error: err.message || "Search failed" }, { status: 500 });
  }
}
