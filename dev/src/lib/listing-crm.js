import User from "@/models/User";

function stringifyId(id) {
  if (id == null || id === false || id === "") return null;
  return typeof id === "object" && id.toString ? id.toString() : String(id);
}

/**
 * Prefer listing.crmUserId (set by Admin onboard); otherwise match a User with the same email
 * (e.g. self-registration before onboard linked the listing).
 */
export function resolveListingCrmUserId(listing, emailToUserIdMap) {
  const stored = stringifyId(listing?.crmUserId);
  if (stored) return stored;
  const email = String(listing?.email || "").trim().toLowerCase();
  if (!email || !emailToUserIdMap) return null;
  return emailToUserIdMap.get(email) || null;
}

/** Batch-load Users by listing emails for resolveListingCrmUserId. */
export async function buildEmailToCrmUserIdMap(emails) {
  const uniq = [
    ...new Set(
      (emails || []).map((e) => String(e || "").trim().toLowerCase()).filter(Boolean)
    ),
  ];
  if (uniq.length === 0) return new Map();
  const users = await User.find({ email: { $in: uniq } })
    .select("_id email")
    .lean();
  return new Map(users.map((u) => [u.email, u._id.toString()]));
}
