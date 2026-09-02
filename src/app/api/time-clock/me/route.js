import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Employee from "@/models/Employee";
import TimeClockPunch from "@/models/TimeClockPunch";
import { findShopByTimeClockToken } from "@/lib/time-clock-settings";
import { evaluatePunchGeofence } from "@/lib/time-clock-geo";
import { getTimeClockSessionFromRequest } from "@/lib/time-clock-session";
import {
  clearTimeClockWallScanCookieOptions,
  getTimeClockWallScanCookieName,
  hasValidWallScan,
} from "@/lib/time-clock-wall-scan";
import {
  computeHoursFromPunches,
  getOpenPunchState,
  lateEarlyFlags,
  serializePunch,
} from "@/lib/time-clock-punches";

async function requireEmployeeSession(request, token) {
  const session = await getTimeClockSessionFromRequest(request);
  if (!session || session.timeClockToken !== token) {
    return { error: NextResponse.json({ error: "Sign in with your passkey first." }, { status: 401 }) };
  }
  const shop = await findShopByTimeClockToken(token);
  if (!shop || shop.ownerEmail !== session.shopEmail) {
    return { error: NextResponse.json({ error: "Invalid session." }, { status: 401 }) };
  }
  return { session, shop };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = String(searchParams.get("token") || "").trim();
    const view = String(searchParams.get("view") || "status").trim();
    if (!token) {
      return NextResponse.json({ error: "token required" }, { status: 400 });
    }
    await connectDB();
    const auth = await requireEmployeeSession(request, token);
    if (auth.error) return auth.error;
    const { session, shop } = auth;
    const emp = await Employee.findOne({
      _id: session.employeeId,
      createdByEmail: shop.ownerEmail,
    }).lean();
    if (!emp || emp.employmentStatus !== "Active" || emp.timeClockEnabled === false) {
      return NextResponse.json({ error: "Employee not eligible for time clock." }, { status: 403 });
    }

    if (view === "history") {
      const from = String(searchParams.get("from") || "").slice(0, 10);
      const to = String(searchParams.get("to") || "").slice(0, 10);
      const punchedAt = {};
      if (from) punchedAt.$gte = new Date(`${from}T00:00:00.000`);
      if (to) punchedAt.$lte = new Date(`${to}T23:59:59.999`);
      const list = await TimeClockPunch.find({
        createdByEmail: shop.ownerEmail,
        employeeId: session.employeeId,
        voidedAt: null,
        ...(Object.keys(punchedAt).length ? { punchedAt } : {}),
      })
        .sort({ punchedAt: -1 })
        .limit(200)
        .lean();
      return NextResponse.json({
        items: list.map((p) => {
          const row = serializePunch(p);
          const flags = lateEarlyFlags(
            row.punchedAt,
            emp.scheduledStart,
            emp.scheduledEnd,
            row.type
          );
          return { ...row, ...flags };
        }),
      });
    }

    if (view === "hours") {
      const from = String(searchParams.get("from") || "").slice(0, 10);
      const to = String(searchParams.get("to") || "").slice(0, 10);
      const punchedAt = {};
      if (from) punchedAt.$gte = new Date(`${from}T00:00:00.000`);
      if (to) punchedAt.$lte = new Date(`${to}T23:59:59.999`);
      else if (!from) {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        punchedAt.$gte = weekAgo;
      }
      const list = await TimeClockPunch.find({
        createdByEmail: shop.ownerEmail,
        employeeId: session.employeeId,
        voidedAt: null,
        ...(Object.keys(punchedAt).length ? { punchedAt } : {}),
      })
        .sort({ punchedAt: 1 })
        .lean();
      const hours = computeHoursFromPunches(list);
      return NextResponse.json({
        totalHours: hours.totalHours,
        byDay: hours.byDay.map((d) => {
          const dayPunches = list.filter(
            (p) => String(p.punchedAt).slice(0, 10) === d.date || new Date(p.punchedAt).toISOString().slice(0, 10) === d.date
          );
          const late = dayPunches.some(
            (p) => lateEarlyFlags(p.punchedAt, emp.scheduledStart, emp.scheduledEnd, p.type).late
          );
          const early = dayPunches.some(
            (p) => lateEarlyFlags(p.punchedAt, emp.scheduledStart, emp.scheduledEnd, p.type).early
          );
          return { ...d, late, early };
        }),
      });
    }

    const state = await getOpenPunchState(shop.ownerEmail, session.employeeId);
    const wallScanAuthorized = await hasValidWallScan(request, token);
    return NextResponse.json({
      employee: {
        id: session.employeeId,
        name: emp.name || session.employeeName,
      },
      geofenceConfigured: shop.lat != null && shop.lng != null,
      wallScanAuthorized,
      ...state,
      nextPunchLabel: state.nextType === "out" ? "Punch Out" : "Punch In",
    });
  } catch (err) {
    console.error("Time clock me GET error:", err);
    return NextResponse.json({ error: "Failed to load status" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = String(body.token || "").trim();
    if (!token) {
      return NextResponse.json({ error: "token required" }, { status: 400 });
    }
    await connectDB();
    const auth = await requireEmployeeSession(request, token);
    if (auth.error) return auth.error;
    const { session, shop } = auth;

    const wallOk = await hasValidWallScan(request, token);
    if (!wallOk) {
      return NextResponse.json(
        {
          error:
            "Scan the shop Time Clock QR code to unlock punching. Opening the app from Home Screen is not enough.",
          wallScanRequired: true,
        },
        { status: 403 }
      );
    }

    if (shop.lat == null || shop.lng == null) {
      return NextResponse.json(
        { error: "Shop punch location is not configured. Ask your manager." },
        { status: 403 }
      );
    }

    const geo = evaluatePunchGeofence(
      { lat: body.lat, lng: body.lng, accuracy: body.accuracy },
      { lat: shop.lat, lng: shop.lng, radiusM: shop.radiusM }
    );
    if (!geo.ok) {
      return NextResponse.json({ error: geo.error }, { status: 403 });
    }

    const emp = await Employee.findOne({
      _id: session.employeeId,
      createdByEmail: shop.ownerEmail,
      timeClockEnabled: { $ne: false },
      employmentStatus: "Active",
    }).lean();
    if (!emp) {
      return NextResponse.json({ error: "Employee not eligible." }, { status: 403 });
    }

    const state = await getOpenPunchState(shop.ownerEmail, session.employeeId);
    let type = state.nextType === "out" ? "out" : "in";
    if (body.type === "break_start" || body.type === "break_end") {
      type = body.type;
    }

    const doc = await TimeClockPunch.create({
      createdByEmail: shop.ownerEmail,
      employeeId: session.employeeId,
      employeeName: emp.name || "",
      employeeNumber: emp.employeeNumber || "",
      type,
      punchedAt: new Date(),
      source: "qr_passkey",
      lat: Number(body.lat),
      lng: Number(body.lng),
      accuracyM: geo.accuracyM,
      distanceM: geo.distanceM,
      userAgent: String(request.headers.get("user-agent") || "").slice(0, 300),
    });

    const next = await getOpenPunchState(shop.ownerEmail, session.employeeId);
    const res = NextResponse.json({
      ok: true,
      punch: serializePunch(doc),
      wallScanAuthorized: false,
      ...next,
      nextPunchLabel: next.nextType === "out" ? "Punch Out" : "Punch In",
    });
    // One scan unlocks one punch. Next punch needs another wall QR scan.
    res.cookies.set(getTimeClockWallScanCookieName(), "", clearTimeClockWallScanCookieOptions());
    return res;
  } catch (err) {
    console.error("Time clock punch error:", err);
    return NextResponse.json({ error: err.message || "Punch failed" }, { status: 500 });
  }
}
