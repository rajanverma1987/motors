/**
 * Simple portal shop-floor job board helpers (SimpleServiceProposal JOBs).
 */

/**
 * Column order follows Settings → Dropdowns (canonical) row order.
 * Stored `shopFloorBoardOrder` limits which status columns appear.
 */
export function computeJobBoardColumns(canonical, boardSubset, jobs) {
  const canon = Array.isArray(canonical)
    ? canonical.map((s) => String(s ?? "").trim()).filter(Boolean)
    : [];
  const board = Array.isArray(boardSubset)
    ? boardSubset.map((s) => String(s ?? "").trim()).filter(Boolean)
    : [];
  const jobList = Array.isArray(jobs) ? jobs : [];

  if (!canon.length) {
    const fromBoard = board.length ? [...board] : [];
    const seen = new Set(fromBoard.map((s) => s.toLowerCase()));
    const tail = [];
    for (const job of jobList) {
      const s = String(job.status ?? "").trim();
      if (!s) continue;
      const sl = s.toLowerCase();
      if (!seen.has(sl)) {
        seen.add(sl);
        tail.push(s);
      }
    }
    return [...fromBoard, ...tail];
  }

  const canonLowerSet = new Set(canon.map((c) => c.toLowerCase()));
  const boardLowerSet = new Set(board.map((b) => b.toLowerCase()));

  const sameStatusSetAsCanon =
    boardLowerSet.size === canonLowerSet.size &&
    [...canonLowerSet].every((c) => boardLowerSet.has(c));

  const fullBoardSignal =
    !board.length || board.length >= canon.length || sameStatusSetAsCanon;

  const pickLower = new Set();
  if (fullBoardSignal) {
    for (const c of canon) pickLower.add(c.toLowerCase());
  } else {
    for (const b of board) pickLower.add(b.toLowerCase());
  }
  for (const job of jobList) {
    const sl = String(job.status ?? "").trim().toLowerCase();
    if (sl && !canonLowerSet.has(sl)) pickLower.add(sl);
  }

  const ordered = canon.filter((c) => pickLower.has(c.toLowerCase()));

  const seenLower = new Set(ordered.map((s) => s.toLowerCase()));
  const unknownTail = [];
  for (const job of jobList) {
    const s = String(job.status ?? "").trim();
    if (!s) continue;
    const sl = s.toLowerCase();
    if (!canonLowerSet.has(sl) && !seenLower.has(sl)) {
      seenLower.add(sl);
      unknownTail.push(s);
    }
  }
  return [...ordered, ...unknownTail];
}

export function resolveStatusToColumnKey(status, columnTitles) {
  const t = String(status ?? "").trim();
  if (!t) return "";
  const tl = t.toLowerCase();
  for (const col of columnTitles) {
    if (String(col ?? "").trim().toLowerCase() === tl) return String(col).trim();
  }
  return t;
}

/**
 * Map a SimpleServiceProposal (lean/serialized) to the board card shape used by
 * Classic JobBoardClient / public share (status = jobStatus).
 */
export function simpleSpToBoardJob(doc) {
  const o = doc?.toObject?.() ?? doc ?? {};
  const id = o._id != null ? String(o._id) : String(o.id || "");
  const documentNumber = String(o.documentNumber || o.quote || "").trim();
  const companyName = String(o.companyName || "").trim();
  const manufacturer = String(o.manufacturer || "").trim();
  const hpKw = String(o.hpKw || "").trim();
  const motorLabel = [manufacturer, hpKw].filter(Boolean).join(" · ") || "Motor";
  return {
    id,
    status: String(o.jobStatus || "").trim(),
    workOrderNumber: documentNumber || "—",
    customerCompany: companyName,
    companyName,
    quoteRfqNumber: documentNumber || "—",
    motorClass: motorLabel,
    documentNumber,
    recordType: String(o.recordType || "").trim().toUpperCase(),
  };
}

export function applySimpleBoardEvent(setJobs, msg) {
  if (!msg || typeof msg !== "object") return;
  if (msg.type === "workOrderUpdated" && msg.workOrder?.id) {
    setJobs((prev) => {
      const i = prev.findIndex((w) => w.id === msg.workOrder.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], ...msg.workOrder };
        return next;
      }
      return [...prev, msg.workOrder];
    });
  } else if (msg.type === "workOrderCreated" && msg.workOrder?.id) {
    setJobs((prev) => {
      if (prev.some((w) => w.id === msg.workOrder.id)) return prev;
      return [msg.workOrder, ...prev];
    });
  } else if (msg.type === "workOrderDeleted" && msg.id) {
    setJobs((prev) => prev.filter((w) => w.id !== msg.id));
  }
}

/** Jobs that belong on the shop floor board. */
export function isSimpleBoardJob(doc) {
  const rt = String(doc?.recordType || "").trim().toUpperCase();
  return rt === "JOB";
}
