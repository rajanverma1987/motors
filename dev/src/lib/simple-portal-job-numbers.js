import SimpleServiceProposal from "@/models/SimpleServiceProposal";
import { computeNextJobNumber } from "@/lib/job-document-number-format";

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Load every job/RFQ number already used in the Simple portal for this shop.
 * @param {string} createdByEmail
 * @returns {Promise<string[]>}
 */
export async function loadExistingSimplePortalJobNumbers(createdByEmail) {
  const email = String(createdByEmail || "").trim().toLowerCase();
  if (!email) return [];
  const docs = await SimpleServiceProposal.find(
    { createdByEmail: email },
    { documentNumber: 1, quote: 1 }
  ).lean();
  const set = new Set();
  for (const doc of docs) {
    for (const raw of [doc.documentNumber, doc.quote]) {
      const n = String(raw || "").trim();
      if (n) set.add(n);
    }
  }
  return [...set];
}

/**
 * Next job number for Simple portal service proposals (queries full DB, not paginated UI rows).
 * @param {string} createdByEmail
 * @param {ReturnType<typeof import("@/lib/user-settings").mergeUserSettings>} mergedSettings
 */
export async function getNextSimplePortalJobNumber(createdByEmail, mergedSettings) {
  const numbers = await loadExistingSimplePortalJobNumbers(createdByEmail);
  return computeNextJobNumber(numbers, mergedSettings);
}

/**
 * @param {string} createdByEmail
 * @param {string} documentNumber
 * @param {string} [excludeId] — current record when updating
 */
export async function isSimplePortalJobNumberTaken(createdByEmail, documentNumber, excludeId = "") {
  const email = String(createdByEmail || "").trim().toLowerCase();
  const num = String(documentNumber || "").trim();
  if (!email || !num) return false;
  const rx = new RegExp(`^${escapeRegExp(num)}$`, "i");
  const q = {
    createdByEmail: email,
    $or: [{ documentNumber: rx }, { quote: rx }],
  };
  const skipId = String(excludeId || "").trim();
  if (skipId) {
    q._id = { $ne: skipId };
  }
  const existing = await SimpleServiceProposal.findOne(q).select("_id").lean();
  return Boolean(existing);
}

/**
 * @param {string} createdByEmail
 * @param {string} documentNumber
 * @param {string} [excludeId]
 */
export async function assertSimplePortalJobNumberAvailable(createdByEmail, documentNumber, excludeId = "") {
  const num = String(documentNumber || "").trim();
  if (!num) return num;
  const taken = await isSimplePortalJobNumberTaken(createdByEmail, num, excludeId);
  if (taken) {
    const err = new Error(`Job number ${num} is already in use.`);
    err.code = "DUPLICATE_JOB_NUMBER";
    throw err;
  }
  return num;
}

/**
 * Allocate a unique job number on create (retries if two requests race).
 * @param {string} createdByEmail
 * @param {ReturnType<typeof import("@/lib/user-settings").mergeUserSettings>} mergedSettings
 * @param {string} [requestedNumber]
 */
export async function resolveSimplePortalJobNumberForCreate(createdByEmail, mergedSettings, requestedNumber = "") {
  const requested = String(requestedNumber || "").trim();
  if (requested) {
    await assertSimplePortalJobNumberAvailable(createdByEmail, requested);
    return requested;
  }
  return getNextSimplePortalJobNumber(createdByEmail, mergedSettings);
}

/**
 * Create with retry when unique index rejects a duplicate number.
 * @param {object} createPayload
 * @param {string} email
 * @param {ReturnType<typeof import("@/lib/user-settings").mergeUserSettings>} mergedSettings
 */
export async function createSimpleServiceProposalWithUniqueJobNumber(createPayload, email, mergedSettings) {
  let documentNumber = String(createPayload.documentNumber || createPayload.quote || "").trim();
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (!documentNumber || attempt > 0) {
      documentNumber = await getNextSimplePortalJobNumber(email, mergedSettings);
    } else {
      const taken = await isSimplePortalJobNumberTaken(email, documentNumber);
      if (taken) {
        documentNumber = await getNextSimplePortalJobNumber(email, mergedSettings);
      }
    }

    try {
      return await SimpleServiceProposal.create({
        ...createPayload,
        documentNumber,
        quote: documentNumber,
      });
    } catch (err) {
      const dup =
        err?.code === 11000 ||
        String(err?.message || "").includes("E11000") ||
        String(err?.message || "").includes("duplicate key");
      if (dup && attempt < maxAttempts - 1) {
        documentNumber = "";
        continue;
      }
      throw err;
    }
  }

  throw new Error("Could not allocate a unique job number. Try again.");
}
