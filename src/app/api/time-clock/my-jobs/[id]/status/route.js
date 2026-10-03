import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import SimpleServiceProposal from "@/models/SimpleServiceProposal";
import { workOrderStatusSelectOptionsFromMerged } from "@/lib/dropdown-catalog";
import { notifySimpleJobBoardFromSp } from "@/lib/job-board-emit";
import { enqueueQuickBooksSync } from "@/lib/quickbooks/triggers";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  findAssignedJob,
  loadShopMergedSettings,
  requireTechnicianSession,
  serializeMyJobDetail,
} from "@/lib/time-clock-my-jobs";

function getParams(context) {
  return typeof context.params?.then === "function"
    ? context.params
    : Promise.resolve(context.params || {});
}

export async function PATCH(request, context) {
  const { allowed } = await checkRateLimit(request, "time-clock-my-jobs-status", 60);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const token = String(searchParams.get("token") || "").trim();
    if (!token) {
      return NextResponse.json({ error: "token required" }, { status: 400 });
    }
    await connectDB();
    const auth = await requireTechnicianSession(request, token);
    if (auth.error) {
      return NextResponse.json(auth.error.body, { status: auth.error.status });
    }
    const { session, shop } = auth;
    const params = await getParams(context);
    const id = String(params?.id || "").trim();
    const previous = await findAssignedJob(shop.ownerEmail, session.employeeId, id);
    if (!previous) {
      return NextResponse.json({ error: "Job not found or not assigned to you." }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const nextStatus = String(body.jobStatus || body.status || "").trim();
    if (!nextStatus) {
      return NextResponse.json({ error: "jobStatus is required" }, { status: 400 });
    }

    const mergedSettings = await loadShopMergedSettings(shop.ownerEmail);
    const allowedStatuses = workOrderStatusSelectOptionsFromMerged(mergedSettings);
    const hit = allowedStatuses.find(
      (o) => String(o.value).toLowerCase() === nextStatus.toLowerCase()
    );
    if (!hit) {
      return NextResponse.json({ error: "Invalid work order status." }, { status: 400 });
    }
    const jobStatus = String(hit.value);

    const doc = await SimpleServiceProposal.findOneAndUpdate(
      { _id: id, createdByEmail: shop.ownerEmail },
      { $set: { jobStatus } },
      { new: true }
    ).lean();
    if (!doc) {
      return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
    }

    void notifySimpleJobBoardFromSp(shop.ownerEmail, previous, doc);
    enqueueQuickBooksSync({
      ownerEmail: shop.ownerEmail,
      trigger: "serviceProposal",
      previous,
      next: doc,
    });

    return NextResponse.json({ ok: true, job: serializeMyJobDetail(doc, mergedSettings) });
  } catch (err) {
    console.error("Time clock my-jobs status PATCH error:", err);
    return NextResponse.json({ error: err.message || "Failed to update status" }, { status: 500 });
  }
}
