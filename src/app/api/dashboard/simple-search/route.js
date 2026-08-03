import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { fetchLeadsForShopUser } from "@/lib/dashboard-leads-scope";
import Customer from "@/models/Customer";
import Vendor from "@/models/Vendor";
import InventoryItem from "@/models/InventoryItem";
import SimpleServiceProposal from "@/models/SimpleServiceProposal";
import SimplePurchaseOrder from "@/models/SimplePurchaseOrder";
import {
  SIMPLE_TAB_CUSTOMERS,
  SIMPLE_TAB_INVENTORY,
  SIMPLE_TAB_INVOICES,
  SIMPLE_TAB_PURCHASE_ORDERS,
  SIMPLE_TAB_SERVICE_PROPOSALS,
} from "@/lib/simple-portal-tabs";
import { SIMPLE_OPEN_LEAD_PREFIX, simplePortalOpenHref } from "@/lib/simple-portal-open";
import { isSimpleInvoiceRecord } from "@/lib/simple-service-proposal-form";

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesQuery(doc, fields, rx) {
  return fields.some((f) => {
    const v = f.split(".").reduce((o, k) => (o == null ? "" : o[k]), doc);
    return v != null && rx.test(String(v));
  });
}

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

    const [leadsRaw, customers, proposals, purchaseOrders, inventory, vendors] = await Promise.all([
      fetchLeadsForShopUser(email),
      Customer.find({ createdByEmail: email }).sort({ createdAt: -1 }).limit(400).lean(),
      SimpleServiceProposal.find({ createdByEmail: email }).sort({ updatedAt: -1 }).limit(400).lean(),
      SimplePurchaseOrder.find({ createdByEmail: email }).sort({ updatedAt: -1 }).limit(400).lean(),
      InventoryItem.find({ createdByEmail: email }).sort({ updatedAt: -1 }).limit(400).lean(),
      Vendor.find({ createdByEmail: email }).sort({ createdAt: -1 }).limit(200).lean(),
    ]);

    const customerMap = Object.fromEntries(customers.map((c) => [c._id.toString(), c]));
    const results = [];

    for (const c of customers) {
      if (
        !matchesQuery(c, ["companyName", "primaryContactName", "email", "phone", "city", "ein"], rx)
      ) {
        continue;
      }
      const id = c._id.toString();
      pushLimited(
        results,
        {
          type: "customer",
          typeLabel: "Customer",
          id,
          title: c.companyName || c.primaryContactName || "Customer",
          subtitle: [c.primaryContactName, c.email, c.phone].filter(Boolean).join(" · "),
          openHref: simplePortalOpenHref(SIMPLE_TAB_CUSTOMERS, id),
        },
        LIMIT,
        "customer"
      );
    }

    for (const lead of Array.isArray(leadsRaw) ? leadsRaw : []) {
      if (
        !matchesQuery(lead, ["company", "name", "email", "phone", "city", "message", "problemDescription"], rx)
      ) {
        continue;
      }
      const id = String(lead.id || lead._id || "").trim();
      if (!id) continue;
      pushLimited(
        results,
        {
          type: "lead",
          typeLabel: "Lead",
          id,
          title: lead.company || lead.name || "Lead",
          subtitle: [lead.name, lead.email, lead.phone].filter(Boolean).join(" · "),
          openHref: simplePortalOpenHref(SIMPLE_TAB_CUSTOMERS, `${SIMPLE_OPEN_LEAD_PREFIX}${id}`),
        },
        LIMIT,
        "lead"
      );
    }

    for (const p of proposals) {
      const id = p._id.toString();
      const docNum = String(p.documentNumber || p.quote || "").trim();
      const company =
        String(p.companyName || "").trim() ||
        customerMap[String(p.customerId || "")]?.companyName ||
        "";
      if (
        !matchesQuery(
          { ...p, documentNumber: docNum, companyName: company },
          ["documentNumber", "companyName", "customerPo", "status", "jobStatus", "customerEmail", "customerPhone"],
          rx
        )
      ) {
        continue;
      }
      const isInvoice = isSimpleInvoiceRecord(p);
      const tab = isInvoice ? SIMPLE_TAB_INVOICES : SIMPLE_TAB_SERVICE_PROPOSALS;
      pushLimited(
        results,
        {
          type: isInvoice ? "invoice" : "service_proposal",
          typeLabel: isInvoice ? "Invoice" : String(p.recordType || "RFQ").toUpperCase() === "JOB" ? "Job" : "Service proposal",
          id,
          title: docNum || company || "Service proposal",
          subtitle: [company, p.status, p.jobStatus].filter(Boolean).join(" · "),
          openHref: simplePortalOpenHref(tab, id),
          linked: String(p.customerId || "").trim()
            ? [
                {
                  type: "customer",
                  label: "Customer",
                  title: company || "Customer",
                  openHref: simplePortalOpenHref(
                    SIMPLE_TAB_CUSTOMERS,
                    String(p.customerId || "").trim()
                  ),
                },
              ]
            : [],
        },
        LIMIT,
        isInvoice ? "invoice" : "service_proposal"
      );
    }

    for (const po of purchaseOrders) {
      const id = po._id.toString();
      if (
        !matchesQuery(po, ["poNumber", "jobNumber", "vendorName", "paymentStatus", "comments"], rx)
      ) {
        continue;
      }
      pushLimited(
        results,
        {
          type: "purchase_order",
          typeLabel: "Purchase order",
          id,
          title: po.poNumber || "Purchase order",
          subtitle: [po.vendorName, po.jobNumber, po.paymentStatus].filter(Boolean).join(" · "),
          openHref: simplePortalOpenHref(SIMPLE_TAB_PURCHASE_ORDERS, id),
        },
        LIMIT,
        "purchase_order"
      );
    }

    for (const item of inventory) {
      const id = item._id.toString();
      if (!matchesQuery(item, ["name", "sku", "uom", "location"], rx)) continue;
      pushLimited(
        results,
        {
          type: "inventory",
          typeLabel: "Inventory",
          id,
          title: item.name || item.sku || "Part",
          subtitle: [item.sku, item.uom, item.location, `On hand ${item.onHand ?? 0}`]
            .filter(Boolean)
            .join(" · "),
          openHref: simplePortalOpenHref(SIMPLE_TAB_INVENTORY, id),
        },
        LIMIT,
        "inventory"
      );
    }

    for (const v of vendors) {
      if (!matchesQuery(v, ["name", "email", "phone", "city", "contactName"], rx)) continue;
      const id = v._id.toString();
      pushLimited(
        results,
        {
          type: "vendor",
          typeLabel: "Vendor",
          id,
          title: v.name || "Vendor",
          subtitle: [v.contactName, v.email, v.phone].filter(Boolean).join(" · "),
          openHref: simplePortalOpenHref(SIMPLE_TAB_PURCHASE_ORDERS, "", { openVendor: id }),
        },
        LIMIT,
        "vendor"
      );
    }

    const cleaned = results.map(({ _type, ...rest }) => rest);
    return NextResponse.json({ results: cleaned, portal: "simple" });
  } catch (err) {
    console.error("GET /api/dashboard/simple-search:", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
