import { connectDB } from "@/lib/db";
import User from "@/models/User";

/** email -> UTC day (YYYY-MM-DD) already stamped in this process. */
const stampedUseDay = new Map();

function utcDayKey(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Record that this shop used the product today.
 * Writes at most once per UTC day, even across logins and later requests.
 */
export async function recordPortalDailyUse(ownerEmail) {
  const email = String(ownerEmail || "").trim().toLowerCase();
  if (!email) return;
  const now = new Date();
  const day = utcDayKey(now);
  if (stampedUseDay.get(email) === day) return;
  stampedUseDay.set(email, day);
  try {
    await connectDB();
    const start = new Date(`${day}T00:00:00.000Z`);
    await User.updateOne(
      {
        email,
        $or: [{ lastLoginAt: null }, { lastLoginAt: { $lt: start } }],
      },
      { $set: { lastLoginAt: now } }
    );
  } catch (err) {
    if (stampedUseDay.get(email) === day) stampedUseDay.delete(email);
    throw err;
  }
}

/** Record a successful portal sign-in. Same once-per-day stamp as later use. */
export async function recordPortalLogin(ownerEmail) {
  await recordPortalDailyUse(ownerEmail);
}
