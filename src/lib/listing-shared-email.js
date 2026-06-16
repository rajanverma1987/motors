/** Platform contact email — admin may create multiple directory listings with this address. */
export const MULTI_LISTING_SHARED_EMAIL = "contact@iqmotorbase.com";

export function allowsMultipleListingsForEmail(email) {
  const norm = String(email || "").trim().toLowerCase();
  return norm === MULTI_LISTING_SHARED_EMAIL;
}
