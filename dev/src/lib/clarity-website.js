/**
 * Microsoft Clarity — public marketing website only.
 * Re-exports shared helpers so existing imports keep working.
 */

export {
  CLARITY_PROJECT_ID,
  isClarityExcludedPath,
  isPrivateAppPath,
  stopClarityCollect,
  stopWebsiteAnalytics,
} from "@/lib/website-analytics";
