/** Keep in sync with src/lib/motor-tag-qr-payload.js in the CRM repo. */
export const MOTOR_TAG_CUSTOMER_PREFIX = "motop:cust:";

/**
 * @param {string} raw
 * @returns {{ type: "customer", customerId: string } | { type: "legacy_job", jobNumber: string } | null}
 */
export function parseMotorTagQrPayload(raw) {
  const line = String(raw ?? "")
    .trim()
    .split(/[\n\r]/)[0]
    .trim();
  if (!line) return null;
  if (line.startsWith(MOTOR_TAG_CUSTOMER_PREFIX)) {
    const customerId = line.slice(MOTOR_TAG_CUSTOMER_PREFIX.length).trim();
    return customerId ? { type: "customer", customerId } : null;
  }
  return { type: "legacy_job", jobNumber: line };
}
