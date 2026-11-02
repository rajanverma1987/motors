/**
 * Send push notifications via Expo Push API (works with Expo / EAS builds).
 * @see https://docs.expo.dev/push-notifications/sending-notifications/
 */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

const CHUNK = 99;

/**
 * @param {Array<{ to: string, title?: string, body?: string, data?: object, sound?: string }>} messages
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function sendExpoPushMessages(messages) {
  const list = (messages || []).filter((m) => m && typeof m.to === "string" && m.to.trim());
  if (!list.length) return { ok: true };

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  for (let i = 0; i < list.length; i += CHUNK) {
    const chunk = list.slice(i, i + CHUNK).map((m) => ({
      to: m.to.trim(),
      title: m.title != null ? String(m.title).slice(0, 200) : undefined,
      body: m.body != null ? String(m.body).slice(0, 400) : undefined,
      data: m.data && typeof m.data === "object" ? m.data : undefined,
      sound: m.sound || "default",
      priority: "high",
    }));
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(chunk),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("Expo push HTTP error:", res.status, json);
        return { ok: false, error: json?.errors?.[0]?.message || res.statusText };
      }
      const errors = (json.data || []).filter((r) => r.status === "error");
      if (errors.length) {
        console.warn("Expo push partial errors:", errors.slice(0, 3));
      }
    } catch (e) {
      console.error("Expo push fetch failed:", e);
      return { ok: false, error: e.message || "push failed" };
    }
  }
  return { ok: true };
}
