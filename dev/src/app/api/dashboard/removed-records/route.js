import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SimpleServiceProposal from "@/models/SimpleServiceProposal";
import SimplePurchaseOrder from "@/models/SimplePurchaseOrder";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { isValidSimplePortalId } from "@/lib/simple-portal-mongo";
import { removedClause } from "@/lib/removed-records";
import { actorFromPortalUser, recordActivity } from "@/lib/activity-log";
import { loadMergedSettingsForEmail } from "@/lib/simple-service-proposal-list-query";
import { isSimpleInvoiceRecord } from "@/lib/simple-service-proposal-form";
import {
  invoiceStatusAllowedSlugs,
  quoteStatusSelectOptionsFromMerged,
} from "@/lib/dropdown-catalog";

function kindLabel(kind) {
  if (kind === "invoice") return "Invoice";
  if (kind === "purchaseOrder") return "Purchase order";
  return "Proposal";
}

function proposalListKind(doc, merged) {
  const invoiceValues = invoiceStatusAllowedSlugs(merged);
  const quoteValues = quoteStatusSelectOptionsFromMerged(merged).map((o) =>
    String(o.value || "").trim()
  );
  return isSimpleInvoiceRecord(doc, invoiceValues, quoteValues) ? "invoice" : "proposal";
}

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const [proposals, purchaseOrders, merged] = await Promise.all([
      SimpleServiceProposal.find({ createdByEmail: email, ...removedClause() })
        .select({
          documentNumber: 1,
          companyName: 1,
          status: 1,
          recordType: 1,
          removedAt: 1,
          removedByEmail: 1,
        })
        .sort({ removedAt: -1 })
        .limit(500)
        .lean(),
      SimplePurchaseOrder.find({ createdByEmail: email, ...removedClause() })
        .select({
          poNumber: 1,
          vendorName: 1,
          paymentStatus: 1,
          removedAt: 1,
          removedByEmail: 1,
        })
        .sort({ removedAt: -1 })
        .limit(500)
        .lean(),
      loadMergedSettingsForEmail(email),
    ]);

    const items = [
      ...(proposals || []).map((doc) => {
        const kind = proposalListKind(doc, merged);
        return {
          id: String(doc._id),
          kind,
          kindLabel: kindLabel(kind),
          number: String(doc.documentNumber || "").trim(),
          partyName: String(doc.companyName || "").trim(),
          status: String(doc.status || "").trim(),
          removedAt: doc.removedAt || null,
          removedByEmail: String(doc.removedByEmail || "").trim(),
        };
      }),
      ...(purchaseOrders || []).map((doc) => ({
        id: String(doc._id),
        kind: "purchaseOrder",
        kindLabel: kindLabel("purchaseOrder"),
        number: String(doc.poNumber || "").trim(),
        partyName: String(doc.vendorName || "").trim(),
        status: String(doc.paymentStatus || "").trim(),
        removedAt: doc.removedAt || null,
        removedByEmail: String(doc.removedByEmail || "").trim(),
      })),
    ].sort((a, b) => new Date(b.removedAt || 0) - new Date(a.removedAt || 0));

    return NextResponse.json({ ok: true, items });
  } catch (err) {
    console.error("Dashboard removed records list error:", err);
    return NextResponse.json({ error: "Failed to load deleted records" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const id = String(body?.id || "").trim();
    const kind = String(body?.kind || "").trim();
    const action = String(body?.action || "").trim();
    if (!isValidSimplePortalId(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    if (action !== "remove" && action !== "restore") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
    const isPo = kind === "purchaseOrder";
    const isProposal = kind === "proposal" || kind === "invoice";
    if (!isPo && !isProposal) {
      return NextResponse.json({ error: "Invalid record kind" }, { status: 400 });
    }

    await connectDB();
    const email = user.email.trim().toLowerCase();
    const Model = isPo ? SimplePurchaseOrder : SimpleServiceProposal;
    const existing = await Model.findOne({ _id: id, createdByEmail: email }).lean();
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const alreadyHidden = Boolean(existing.removedAt);
    if (action === "remove" && alreadyHidden) {
      return NextResponse.json({ error: "This record is already in Deleted." }, { status: 400 });
    }
    if (action === "restore" && !alreadyHidden) {
      return NextResponse.json({ error: "This record is already on the list." }, { status: 400 });
    }

    const removedAt = action === "remove" ? new Date() : null;
    const removedByEmail = action === "remove" ? email : "";
    const doc = await Model.findOneAndUpdate(
      { _id: id, createdByEmail: email },
      { $set: { removedAt, removedByEmail } },
      { new: true }
    ).lean();
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const actor = actorFromPortalUser(user);
    const number = isPo
      ? String(doc.poNumber || "").trim()
      : String(doc.documentNumber || "").trim();
    const partyName = isPo
      ? String(doc.vendorName || "").trim()
      : String(doc.companyName || "").trim();
    const recordKind = isPo ? "purchaseOrder" : "proposal";
    const label = isPo ? "Purchase order" : kind === "invoice" ? "Invoice" : "Proposal";
    await recordActivity({
      ownerEmail: email,
      ...actor,
      action: action === "remove" ? "removed" : "restored",
      recordKind,
      recordId: id,
      recordNumber: number,
      partyName,
      summary:
        action === "remove"
          ? `${label} ${number || id} removed from the list.`
          : `${label} ${number || id} restored to the list.`,
    });

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("Dashboard removed records action error:", err);
    return NextResponse.json({ error: "Failed to update the record" }, { status: 500 });
  }
}
