/** QR payload prefix — technician app scans → work orders for this customer. */
export const MOTOR_TAG_CUSTOMER_PREFIX = "motop:cust:";

export function encodeMotorTagCustomerQr(customerId) {
  const id = String(customerId ?? "").trim();
  if (!id) return "";
  return `${MOTOR_TAG_CUSTOMER_PREFIX}${id}`;
}

/**
 * @param {string} raw — scanned QR text
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
