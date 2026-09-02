import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Employee from "@/models/Employee";
import TimeClockPunch from "@/models/TimeClockPunch";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import {
  ensureTimeClockSettings,
  updateTimeClockGeofence,
} from "@/lib/time-clock-settings";
import { getOpenPunchState, serializePunch } from "@/lib/time-clock-punches";
import { toEmployeeJson } from "@/lib/employee-record";

async function requireShop(request) {
  const user = await getPortalUserFromRequest(request);
  if (!user?.email) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { email: user.email.trim().toLowerCase() };
}

export async function GET(request) {
  try {
    const auth = await requireShop(request);
    if (auth.error) return auth.error;
    await connectDB();
    const settings = await ensureTimeClockSettings(auth.email);
    const userDoc = await User.findOne({ email: auth.email }).select("shopName").lean();
    const shopName = String(userDoc?.shopName || "").trim() || "Shop";
    // Always use the public site origin for shop QR. Behind IIS/reverse proxies the
    // Node Host header is often localhost, which must never be printed for phones.
    const clockBase = getPublicSiteUrl(request).replace(/\/$/, "");
    const url = `${clockBase}/time-clock/${encodeURIComponent(settings.token)}`;
    if (/localhost|127\.0\.0\.1/i.test(url) && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        {
          error:
            "Time clock URL resolved to localhost. Set SITE_URL or NEXT_PUBLIC_SITE_URL on the server.",
        },
        { status: 500 }
      );
    }

    const employees = await Employee.find({ createdByEmail: auth.email })
      .select(
        "name email employeeNumber department scheduledStart scheduledEnd passkeys timeClockEnabled employmentStatus"
      )
      .sort({ name: 1 })
      .lean();

    const clockEligible = employees.filter((emp) => {
      const status = String(emp.employmentStatus || "Active").trim() || "Active";
      const clockOn = emp.timeClockEnabled !== false;
      return status === "Active" && clockOn;
    });

    const floor = [];
    for (const emp of clockEligible) {
      const id = String(emp._id);
      const state = await getOpenPunchState(auth.email, id);
      if (state.clockedIn) {
        floor.push({
          employeeId: id,
          name: emp.name || "",
          employeeNumber: emp.employeeNumber || "",
          department: emp.department || "",
          onBreak: state.onBreak,
          lastPunch: state.lastPunch,
        });
      }
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayPunches = await TimeClockPunch.find({
      createdByEmail: auth.email,
      punchedAt: { $gte: startOfDay },
      voidedAt: null,
    })
      .sort({ punchedAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json({
      shopName,
      token: settings.token,
      url,
      geofence: {
        lat: settings.lat,
        lng: settings.lng,
        radiusM: settings.radiusM,
        configured: settings.lat != null && settings.lng != null,
      },
      floor,
      todayPunches: todayPunches.map(serializePunch),
      employeeCount: employees.length,
      employees: employees.map((e) => toEmployeeJson(e)),
    });
  } catch (err) {
    console.error("Dashboard time clock GET error:", err);
    return NextResponse.json({ error: "Failed to load time clock settings" }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const auth = await requireShop(request);
    if (auth.error) return auth.error;
    await connectDB();
    const body = await request.json().catch(() => ({}));
    if (body.lat != null || body.lng != null || body.radiusM != null) {
      const settings = await updateTimeClockGeofence(auth.email, {
        lat: body.lat,
        lng: body.lng,
        radiusM: body.radiusM,
      });
      return NextResponse.json({
        ok: true,
        geofence: {
          lat: settings.lat,
          lng: settings.lng,
          radiusM: settings.radiusM,
          configured: settings.lat != null && settings.lng != null,
        },
      });
    }
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  } catch (err) {
    console.error("Dashboard time clock PATCH error:", err);
    return NextResponse.json({ error: err.message || "Failed to update" }, { status: 500 });
  }
}
