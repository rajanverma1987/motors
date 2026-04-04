import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import MotorRepairJob from "@/models/MotorRepairJob";
import Motor from "@/models/Motor";
import Customer from "@/models/Customer";
import { applyMotorNameplateFields } from "@/lib/motor-nameplate-patch";

function toPublicJob(doc) {
  if (!doc) return null;
  const o = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return {
    ...o,
    id: o._id.toString(),
    _id: undefined,
  };
}

async function nextJobNumber(email) {
  const n = await MotorRepairJob.countDocuments({ createdByEmail: email });
  return `RF-${String(n + 1).padStart(5, "0")}`;
}

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectDB();
    const email = user.email.trim().toLowerCase();
    const list = await MotorRepairJob.find({ createdByEmail: email }).sort({ createdAt: -1 }).lean();
    const customerIds = [...new Set(list.map((j) => j.customerId).filter(Boolean))];
    const motorIds = [...new Set(list.map((j) => j.motorId).filter(Boolean))];
    const [customers, motors] = await Promise.all([
      Customer.find({ _id: { $in: customerIds }, createdByEmail: email }).lean(),
      Motor.find({ _id: { $in: motorIds }, createdByEmail: email }).lean(),
    ]);
    const custMap = Object.fromEntries((customers || []).map((c) => [c._id.toString(), c.companyName || c.primaryContactName || ""]));
    const motorMap = Object.fromEntries((motors || []).map((m) => [m._id.toString(), `${m.manufacturer || ""} ${m.model || ""}`.trim() || m.serialNumber || "Motor"]));
    return NextResponse.json(
      list.map((j) => ({
        ...toPublicJob(j),
        customerLabel: custMap[j.customerId] || "",
        motorLabel: motorMap[j.motorId] || "",
      }))
    );
  } catch (err) {
    console.error("repair-flow jobs GET:", err);
    return NextResponse.json({ error: "Failed to list jobs" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const motorId = typeof body.motorId === "string" ? body.motorId.trim() : "";
    const customerId = typeof body.customerId === "string" ? body.customerId.trim() : "";
    const complaint = typeof body.complaint === "string" ? body.complaint.trim().slice(0, 8000) : "";
    const nameplateSummary = typeof body.nameplateSummary === "string" ? body.nameplateSummary.trim().slice(0, 4000) : "";
    const intakeNotes = typeof body.intakeNotes === "string" ? body.intakeNotes.trim().slice(0, 8000) : "";
    const motorUpdates = body.motorUpdates && typeof body.motorUpdates === "object" ? body.motorUpdates : null;

    if (!motorId || !mongoose.isValidObjectId(motorId)) {
      return NextResponse.json({ error: "Valid motor is required" }, { status: 400 });
    }
    if (!customerId || !mongoose.isValidObjectId(customerId)) {
      return NextResponse.json({ error: "Valid customer is required" }, { status: 400 });
    }

    await connectDB();
    const email = user.email.trim().toLowerCase();
    const [motorDoc, customer] = await Promise.all([
      Motor.findOne({ _id: motorId, createdByEmail: email }),
      Customer.findOne({ _id: customerId, createdByEmail: email }).lean(),
    ]);
    if (!motorDoc) {
      return NextResponse.json({ error: "Motor not found" }, { status: 404 });
    }
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    if (String(motorDoc.customerId) !== customerId) {
      return NextResponse.json({ error: "Motor does not belong to this customer" }, { status: 400 });
    }

    if (motorUpdates) {
      applyMotorNameplateFields(motorDoc, motorUpdates);
      await motorDoc.save();
    }

    const jobNumber = await nextJobNumber(email);
    const doc = await MotorRepairJob.create({
      createdByEmail: email,
      jobNumber,
      motorId,
      customerId,
      complaint,
      nameplateSummary,
      intakeNotes,
      phase: complaint ? "pre_inspection" : "intake",
    });

    return NextResponse.json({ ok: true, job: toPublicJob(doc) });
  } catch (err) {
    console.error("repair-flow jobs POST:", err);
    return NextResponse.json({ error: err.message || "Failed to create job" }, { status: 500 });
  }
}
