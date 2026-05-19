import { getNextJobNumber } from "@/lib/job-document-numbers";

/** @deprecated Use getNextJobNumber — kept for imports that pass settings separately. */
export async function getNextRfqNumber(createdByEmail, mergedSettings) {
  return getNextJobNumber(createdByEmail, mergedSettings);
}
