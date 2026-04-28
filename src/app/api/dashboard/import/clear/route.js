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

    const results = await Promise.all([
      Customer.deleteMany({ createdByEmail: ownerEmail }),
      Motor.deleteMany({ createdByEmail: ownerEmail }),
      Quote.deleteMany({ createdByEmail: ownerEmail }),
      WorkOrder.deleteMany({ createdByEmail: ownerEmail }),
      Invoice.deleteMany({ createdByEmail: ownerEmail }),
      Vendor.deleteMany({ createdByEmail: ownerEmail }),
      InventoryItem.deleteMany({ createdByEmail: ownerEmail }),
      PurchaseOrder.deleteMany({ createdByEmail: ownerEmail }),
      Employee.deleteMany({ createdByEmail: ownerEmail }),
      SalesPerson.deleteMany({ createdByEmail: ownerEmail }),
      SalesCommission.deleteMany({ createdByEmail: ownerEmail }),
      MotorRepairJob.deleteMany({ createdByEmail: ownerEmail }),
      MotorRepairFlowQuote.deleteMany({ createdByEmail: ownerEmail }),
      MotorRepairInspection.deleteMany({ createdByEmail: ownerEmail }),
    ]);

    const deletedCount = results.reduce((sum, r) => sum + (Number(r?.deletedCount) || 0), 0);
    return NextResponse.json({ ok: true, deletedCount });
  } catch (err) {
    console.error("Import clear error:", err);
    return NextResponse.json({ error: err?.message || "Failed to clear collections" }, { status: 500 });
  }
}

