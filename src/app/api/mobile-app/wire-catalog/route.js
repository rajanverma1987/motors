import { NextResponse } from "next/server";
import { getMobileAppAccountFromRequest, mobileAppUnauthorized } from "@/lib/mobile-app-auth";
import { clampString } from "@/lib/validation";
import { CIR_MILLS_UNIT_AWG, CIR_MILLS_UNIT_METRIC, normalizeCirMillsUnit } from "@/lib/platform-cir-mills";

export const dynamic = "force-dynamic";

const MAX_CUSTOM = 100;

function toWire(w) {
  return {
    id: String(w.id),
    size: String(w.size || "").trim(),
    circularMills: Number(w.circularMills) || 0,
    wireUnit: normalizeCirMillsUnit(w.wireUnit || CIR_MILLS_UNIT_AWG),
    custom: true,
  };
}

export async function GET(request) {
  try {
    const account = await getMobileAppAccountFromRequest(request);
    if (!account) {
      return NextResponse.json(mobileAppUnauthorized(), { status: 401 });
    }
    const customWires = (account.customWires || []).map(toWire);
    return NextResponse.json({ customWires });
  } catch (err) {
    console.error("mobile-app wire-catalog GET:", err);
    return NextResponse.json({ error: err.message || "Failed to load catalog" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const account = await getMobileAppAccountFromRequest(request);
    if (!account) {
      return NextResponse.json(mobileAppUnauthorized(), { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const size = clampString(body.size, 40);
    const circularMills = Number(body.circularMills);
    const wireUnit = normalizeCirMillsUnit(body.wireUnit || body.unit || CIR_MILLS_UNIT_AWG);
    if (!size) {
      return NextResponse.json({ error: "Enter a wire size (e.g. 19 or 18.5)." }, { status: 400 });
    }
    if (!Number.isFinite(circularMills) || circularMills <= 0) {
      return NextResponse.json({ error: "Enter a positive circular mils value." }, { status: 400 });
    }
    if (wireUnit !== CIR_MILLS_UNIT_AWG && wireUnit !== CIR_MILLS_UNIT_METRIC) {
      return NextResponse.json({ error: "Wire unit must be AWG or Metric." }, { status: 400 });
    }
    const existing = account.customWires || [];
    if (existing.length >= MAX_CUSTOM) {
      return NextResponse.json({ error: `You can add at most ${MAX_CUSTOM} custom sizes.` }, { status: 400 });
    }
    const sizeKey = size.toLowerCase();
    if (
      existing.some(
        (w) =>
          String(w.size).trim().toLowerCase() === sizeKey &&
          normalizeCirMillsUnit(w.wireUnit || CIR_MILLS_UNIT_AWG) === wireUnit
      )
    ) {
      return NextResponse.json(
        { error: `That size is already in your ${wireUnit === CIR_MILLS_UNIT_METRIC ? "Metric" : "AWG"} custom list.` },
        { status: 400 }
      );
    }
    const wire = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      size,
      circularMills,
      wireUnit,
    };
    account.customWires = [...existing, wire];
    await account.save();
    return NextResponse.json({ wire: toWire(wire), customWires: account.customWires.map(toWire) });
  } catch (err) {
    console.error("mobile-app wire-catalog POST:", err);
    return NextResponse.json({ error: err.message || "Failed to add wire" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const account = await getMobileAppAccountFromRequest(request);
    if (!account) {
      return NextResponse.json(mobileAppUnauthorized(), { status: 401 });
    }
    const id = String(new URL(request.url).searchParams.get("id") || "").trim();
    if (!id) {
      return NextResponse.json({ error: "Wire id required." }, { status: 400 });
    }
    account.customWires = (account.customWires || []).filter((w) => String(w.id) !== id);
    await account.save();
    return NextResponse.json({ customWires: account.customWires.map(toWire) });
  } catch (err) {
    console.error("mobile-app wire-catalog DELETE:", err);
    return NextResponse.json({ error: err.message || "Failed to remove wire" }, { status: 500 });
  }
}
