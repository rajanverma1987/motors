/**
 * In-memory SSE fan-out for job board live updates (single Node process).
 * For multi-instance deploys, replace with Redis pub/sub or similar.
 */

/** @type {Map<string, Set<(chunk: string) => void>>} */
const userChannels = new Map();
/** @type {Map<string, Set<(chunk: string) => void>>} */
const tokenChannels = new Map();

function subscribe(map, key, send) {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(send);
  return () => {
    const set = map.get(key);
    if (!set) return;
    set.delete(send);
    if (set.size === 0) map.delete(key);
  };
}

export function subscribeJobBoardByUser(email, send) {
  return subscribe(userChannels, String(email || "").trim().toLowerCase(), send);
}

export function subscribeJobBoardByToken(token, send) {
  return subscribe(tokenChannels, String(token || "").trim(), send);
}

function broadcast(map, key, line) {
  const set = map.get(key);
  if (!set?.size) return;
  for (const send of [...set]) {
    try {
      send(line);
    } catch {
      /* stream closed */
    }
  }
}

/**
 * @param {string} ownerEmail
 * @param {string | null | undefined} jobBoardToken
 * @param {Record<string, unknown>} payload
 */
export function emitJobBoardEvent(ownerEmail, jobBoardToken, payload) {
  const line = `data: ${JSON.stringify(payload)}\n\n`;
  const email = String(ownerEmail || "").trim().toLowerCase();
  if (email) broadcast(userChannels, email, line);
  const tok = String(jobBoardToken || "").trim();
  if (tok) broadcast(tokenChannels, tok, line);
}
