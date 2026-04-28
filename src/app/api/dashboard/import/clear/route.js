import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import Customer from "@/models/Customer";
import Motor from "@/models/Motor";
import Quote from "@/models/Quote";
import WorkOrder from "@/models/WorkOrder";
import Invoice from "@/models/Invoice";
import Vendor from "@/models/Vendor";
import InventoryItem from "@/models/InventoryItem";
import PurchaseOrder from "@/models/PurchaseOrder";
import Employee from "@/models/Employee";
import SalesPerson from "@/models/SalesPerson";
import SalesCommission from "@/models/SalesCommission";
import MotorRepairJob from "@/models/MotorRepairJob";
import MotorRepairFlowQuote from "@/models/MotorRepairFlowQuote";
import MotorRepairInspection from "@/models/MotorRepairInspection";

const CLEAR_CONFIRM_PHRASE = "CLEAR_ALL_IMPORT_DATA";

const ALL_COLLECTION_KEYS = [
  "customers",
  "customerAdditionalContacts",
  "motors",
  "quotes",
  "quoteScopeLines",
  "quotePartLines",
  "workOrders",
  "invoices",
  "vendors",
  "inventoryItems",
  "purchaseOrders",
  "employees",
  "salesPersons",
  "salesCommissions",
  "repairFlowJobs",
  "repairFlowQuotes",
  "repairFlowInspections",
];

export async function POST(request) {
  const user = await getPortalUserFromRequest(request);
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const confirmPhrase = String(body?.confirmPhrase || "");
    if (confirmPhrase !== CLEAR_CONFIRM_PHRASE) {
      return NextResponse.json({ error: "Invalid confirmation phrase." }, { status: 400 });
    }

    await connectDB();
    const ownerEmail = user.email.trim().toLowerCase();
    const requestedCollection = String(body?.collection || "").trim();

    const deleteOne = async (collection) => {
      switch (collection) {
        case "customers":
          return Customer.deleteMany({ createdByEmail: ownerEmail });
        case "customerAdditionalContacts":
          return Customer.updateMany({ createdByEmail: ownerEmail }, { $set: { additionalContacts: [] } });
        case "motors":
          return Motor.deleteMany({ createdByEmail: ownerEmail });
        case "quotes":
          return Quote.deleteMany({ createdByEmail: ownerEmail });
        case "quoteScopeLines":
          return Quote.updateMany({ createdByEmail: ownerEmail }, { $set: { scopeLines: [], laborTotal: "0.00" } });
        case "quotePartLines":
          return Quote.updateMany({ createdByEmail: ownerEmail }, { $set: { partsLines: [], partsTotal: "0.00" } });
        case "workOrders":
          return WorkOrder.deleteMany({ createdByEmail: ownerEmail });
        case "invoices":
          return Invoice.deleteMany({ createdByEmail: ownerEmail });
        case "vendors":
          return Vendor.deleteMany({ createdByEmail: ownerEmail });
        case "inventoryItems":
          return InventoryItem.deleteMany({ createdByEmail: ownerEmail });
        case "purchaseOrders":
          return PurchaseOrder.deleteMany({ createdByEmail: ownerEmail });
        case "employees":
          return Employee.deleteMany({ createdByEmail: ownerEmail });
        case "salesPersons":
          return SalesPerson.deleteMany({ createdByEmail: ownerEmail });
        case "salesCommissions":
          return SalesCommission.deleteMany({ createdByEmail: ownerEmail });
        case "repairFlowJobs":
          return MotorRepairJob.deleteMany({ createdByEmail: ownerEmail });
        case "repairFlowQuotes":
          return MotorRepairFlowQuote.deleteMany({ createdByEmail: ownerEmail });
        case "repairFlowInspections":
          return MotorRepairInspection.deleteMany({ createdByEmail: ownerEmail });
        default:
          return null;
      }
    };

    if (requestedCollection) {
      if (!ALL_COLLECTION_KEYS.includes(requestedCollection)) {
        return NextResponse.json({ error: "Unknown collection." }, { status: 400 });
      }
      const result = await deleteOne(requestedCollection);
      const affectedCount = Number(result?.deletedCount ?? result?.modifiedCount ?? 0);
      return NextResponse.json({
        ok: true,
        collection: requestedCollection,
        deletedCount: affectedCount,
      });
    }

    const results = await Promise.all(ALL_COLLECTION_KEYS.map((c) => deleteOne(c)));
    const deletedCount = results.reduce(
      (sum, r) => sum + (Number(r?.deletedCount ?? r?.modifiedCount) || 0),
      0,
    );
    return NextResponse.json({ ok: true, deletedCount });
  } catch (err) {
    console.error("Import clear error:", err);
    return NextResponse.json({ error: err?.message || "Failed to clear collections" }, { status: 500 });
  }
}

