import UserSettings from "@/models/UserSettings";
import { mergeUserSettings } from "@/lib/user-settings";
import { normalizePortalUi } from "@/lib/portal-view";

/**
 * Shop-level portal UI (Basic vs Classic) from UserSettings.
 * @param {string} ownerEmail
 */
export async function loadShopPortalUi(ownerEmail) {
  const email = String(ownerEmail || "")
    .trim()
    .toLowerCase();
  if (!email) return normalizePortalUi("");
  const doc = await UserSettings.findOne({ ownerEmail: email }).select("settings.portalUi").lean();
  return normalizePortalUi(mergeUserSettings(doc?.settings).portalUi);
}
