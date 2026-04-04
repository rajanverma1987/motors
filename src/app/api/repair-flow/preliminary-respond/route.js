import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import MotorRepairJob from "@/models/MotorRepairJob";
import MotorRepairFlowQuote from "@/models/MotorRepairFlowQuote";
import User from "@/models/User";

function money(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "0.00";
  return x.toFixed(2);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = typeof searchParams.get("token") === "string" ? searchParams.get("token").trim() : "";
    if (!token || token.length < 16) {
      return NextResponse.json({ error: "Invalid link" }, { status: 400 });
    }

    await connectDB();
    const job = await MotorRepairJob.findOne({ preliminaryRespondToken: token }).lean();
    if (!job) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
    }

    const ownerEmail = String(job.createdByEmail || "").trim().toLowerCase();
    const owner = ownerEmail ? await User.findOne({ email: ownerEmail }).select("shopName").lean() : null;
    const shopName =
      (owner?.shopName && String(owner.shopName).trim()) ||
      process.env.MOTOR_SHOP_COMPANY_NAME?.trim() ||
      "Motor Shop";

    if (job.phase !== "awaiting_preliminary_approval") {
      return NextResponse.json({
        resolved: true,
        jobNumber: job.jobNumber || "",
        shopName,
        phase: job.phase,
        message:
          job.phase === "teardown_approved" || job.phase === "disassembly_detailed"
            ? "You already approved this preliminary quote. Thank you."
            : job.phase === "closed_returned" || job.phase === "closed_scrap"
              ? "This preliminary request has been closed."
              : "This link is no longer active for a preliminary decision.",
      });
    }

    const qid = job.preliminaryFlowQuoteId;
    if (!mongoose.isValidObjectId(qid)) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const quote = await MotorRepairFlowQuote.findOne({
      _id: qid,
      createdByEmail: ownerEmail,
      stage: "preliminary",
    }).lean();

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const lineItems = Array.isArray(quote.lineItems) ? quote.lineItems : [];
    const subtotal = Number(quote.subtotal) || 0;

    return NextResponse.json({
      resolved: false,
      jobNumber: job.jobNumber || "",
      shopName,
      quoteNotes: quote.quoteNotes || "",
      subtotal: money(subtotal),
      lineItems: lineItems.map((row) => ({
        description: row.description || "",
        quantity: row.quantity ?? 1,
        unitPrice: money(row.unitPrice ?? 0),
        lineTotal: money(Number(row.quantity || 0) * Number(row.unitPrice || 0)),
        subjectToTeardown: !!row.subjectToTeardown,
        notes: row.notes || "",
      })),
    });
  } catch (err) {
    console.error("preliminary-respond GET:", err);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const action = typeof body.action === "string" ? body.action.trim() : "";
    if (!token || token.length < 16) {
      return NextResponse.json({ error: "Invalid link" }, { status: 400 });
    }

    const allowed = new Set(["approve_preliminary", "reject_preliminary", "scrap_preliminary"]);
    if (!allowed.has(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await connectDB();
    const job = await MotorRepairJob.findOne({ preliminaryRespondToken: token });
    if (!job) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
    }

    if (job.phase !== "awaiting_preliminary_approval") {
      return NextResponse.json({ error: "This preliminary quote is no longer awaiting your decision." }, { status: 400 });
    }

    const email = String(job.createdByEmail || "").trim().toLowerCase();
    const loadQuote = async (qid) => {
      if (!qid || !mongoose.isValidObjectId(qid)) return null;
      return MotorRepairFlowQuote.findOne({ _id: qid, createdByEmail: email });
    };

    switch (action) {
      case "approve_preliminary": {
        const q = await loadQuote(job.preliminaryFlowQuoteId);
        if (!q) {
          return NextResponse.json({ error: "Preliminary quote not found" }, { status: 400 });
        }
        q.status = "approved";
        await q.save();
        job.phase = "teardown_approved";
        await job.save();
        break;
      }
      case "reject_preliminary": {
        const q = await loadQuote(job.preliminaryFlowQuoteId);
        if (q) {
          q.status = "rejected";
          await q.save();
        }
        job.phase = "closed_returned";
        await job.save();
        break;
      }
      case "scrap_preliminary": {
        const q = await loadQuote(job.preliminaryFlowQuoteId);
        if (q) {
          q.status = "rejected";
          await q.save();
        }
        job.phase = "closed_scrap";
        await job.save();
        break;
      }
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message:
        action === "approve_preliminary"
          ? "Thank you. We will proceed with disassembly as quoted."
          : action === "scrap_preliminary"
            ? "Your authorization to scrap has been recorded. We will follow up if needed."
            : "Your decision has been recorded. We will follow up regarding pickup or next steps.",
    });
  } catch (err) {
    console.error("preliminary-respond POST:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
