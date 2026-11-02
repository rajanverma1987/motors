/** Marketing / checkout paths for calculators subscription. */
export const CALCULATORS_SUBSCRIBE_PATH = "/calculators-subscription";

export function safeCalculatorNextPath(raw) {
  if (raw == null || typeof raw !== "string") return CALCULATORS_SUBSCRIBE_PATH;
  let s = raw.trim();
  try {
    s = decodeURIComponent(s);
  } catch {
    return CALCULATORS_SUBSCRIBE_PATH;
  }
  s = s.trim();
  if (!s.startsWith("/") || s.startsWith("//")) return CALCULATORS_SUBSCRIBE_PATH;
  if (s.includes("\\") || s.includes("\n") || s.includes("\r")) return CALCULATORS_SUBSCRIBE_PATH;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/i.test(s)) return CALCULATORS_SUBSCRIBE_PATH;
  return s;
}

export function calculatorAuthUrls(nextPath) {
  const next = encodeURIComponent(safeCalculatorNextPath(nextPath));
  return {
    loginUrl: `/login?next=${next}&intent=calculators`,
    registerUrl: `/register?next=${next}&intent=calculators`,
    subscribePath: safeCalculatorNextPath(nextPath),
  };
}

export const CALCULATOR_EXISTING_ACCOUNT_MESSAGE =
  "Log in with your email and password to subscribe. If you forgot your password, contact us and we will help you reset it.";
