import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import GuestCalculatorUnlock from "@/models/GuestCalculatorUnlock";

export const GUEST_CALC_UNLOCK_COOKIE = "motors_calc_guest_unlock";

export function getGuestOrderIdFromCookieHeader(cookieHeader) {
  const match = (cookieHeader || "").match(
    new RegExp(`${GUEST_CALC_UNLOCK_COOKIE}=([^;]+)`)
  );
  return match ? decodeURIComponent(match[1]).trim() : "";
}

export async function getGuestOrderIdFromRequest(request) {
  return getGuestOrderIdFromCookieHeader(request.headers.get("cookie") || "");
}

export async function setGuestUnlockCookie(orderId) {
  const id = String(orderId || "").trim();
  if (!id) return;
  const cookieStore = await cookies();
  cookieStore.set(GUEST_CALC_UNLOCK_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });
}

export async function clearGuestUnlockCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(GUEST_CALC_UNLOCK_COOKIE);
}

export async function findGuestUnlockByOrderId(orderId) {
  const id = String(orderId || "").trim();
  if (!id) return null;
  await connectDB();
  return GuestCalculatorUnlock.findOne({ orderId: id }).lean();
}

export async function createPendingGuestOrder(orderId) {
  const id = String(orderId || "").trim();
  if (!id) throw new Error("Missing order id");
  await connectDB();
  await GuestCalculatorUnlock.findOneAndUpdate(
    { orderId: id },
    { $setOnInsert: { orderId: id, status: "pending" } },
    { upsert: true, new: true }
  );
}

export async function markGuestOrderCaptured(orderId) {
  const id = String(orderId || "").trim();
  if (!id) return null;
  await connectDB();
  return GuestCalculatorUnlock.findOneAndUpdate(
    { orderId: id },
    { $set: { status: "captured", capturedAt: new Date() } },
    { new: true }
  ).lean();
}

export async function markGuestOrderUsed(orderId) {
  const id = String(orderId || "").trim();
  if (!id) return null;
  await connectDB();
  return GuestCalculatorUnlock.findOneAndUpdate(
    { orderId: id, status: "captured" },
    { $set: { status: "used", usedAt: new Date() } },
    { new: true }
  ).lean();
}

/** Valid captured, unused guest unlock for this browser session. */
export async function getActiveGuestUnlockFromRequest(request) {
  const orderId = await getGuestOrderIdFromRequest(request);
  if (!orderId) return null;
  const doc = await findGuestUnlockByOrderId(orderId);
  if (!doc || doc.status !== "captured") return null;
  return { orderId, doc };
}
