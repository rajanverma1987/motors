/** Simple product dropdowns (not status lists or master data). Stored on UserSettings.productDropdowns. */

export const MAX_PRODUCT_DROPDOWN_OPTIONS = 25;

export const DEFAULT_MANNER_OF_TRANSPORT_RECEIVING = [
  "Customer drop-off",
  "Courier",
  "Freight line / LTL",
  "UPS",
  "FedEx",
  "Shop delivery",
  "Internal / dock",
  "Other",
];

export const DEFAULT_MANNER_OF_TRANSPORT_SHIPPING = [
  "Customer pickup",
  "Courier",
  "Freight line / LTL",
  "UPS",
  "FedEx",
  "Shop pickup",
  "Internal / dock",
  "Other",
];

/** @deprecated legacy single list — migrated to receiving/shipping keys on read */
export const DEFAULT_MANNER_OF_TRANSPORT = DEFAULT_MANNER_OF_TRANSPORT_RECEIVING;

export const DEFAULT_QUOTE_TYPES = ["Phone", "Email", "Walk-in", "Other"];

export const DEFAULT_PAYMENT_METHODS = ["Check", "ACH", "Card", "Cash", "Wire", "Other"];

export const PRODUCT_DROPDOWN_DEFINITIONS = {
  manner_of_transport_receiving: {
    key: "manner_of_transport_receiving",
    label: "Manner of transport (Receiving)",
    description: "Transport options on motor receiving (inbound) forms.",
    placeholder: "Select manner of transport",
    defaults: DEFAULT_MANNER_OF_TRANSPORT_RECEIVING,
  },
  manner_of_transport_shipping: {
    key: "manner_of_transport_shipping",
    label: "Manner of transport (Shipping)",
    description: "Transport options on motor shipping (outbound) forms.",
    placeholder: "Select manner of transport",
    defaults: DEFAULT_MANNER_OF_TRANSPORT_SHIPPING,
  },
  quote_type: {
    key: "quote_type",
    label: "Quote type",
    description: "How the customer reached out on the Service Proposal form.",
    placeholder: "Select quote type",
    defaults: DEFAULT_QUOTE_TYPES,
  },
  payment_method: {
    key: "payment_method",
    label: "Payment method",
    description: "Options when recording invoice or purchase order payments.",
    placeholder: "Select payment method",
    defaults: DEFAULT_PAYMENT_METHODS,
  },
};

export const PRODUCT_DROPDOWN_KEYS = Object.keys(PRODUCT_DROPDOWN_DEFINITIONS);

/** @param {unknown} raw */
function normalizeOptionList(raw, fallback) {
  const fb = Array.isArray(fallback) ? fallback : [];
  const arr = Array.isArray(raw) ? raw : [];
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const label = String(item ?? "")
      .trim()
      .slice(0, 80);
    if (!label || seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    out.push(label);
    if (out.length >= MAX_PRODUCT_DROPDOWN_OPTIONS) break;
  }
  return out.length ? out : [...fb];
}

/** @param {unknown} raw */
export function normalizeProductDropdowns(raw) {
  const src = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const legacyTransport = Array.isArray(src.manner_of_transport) ? src.manner_of_transport : null;
  /** @type {Record<string, string[]>} */
  const out = {};
  for (const def of Object.values(PRODUCT_DROPDOWN_DEFINITIONS)) {
    let list = src[def.key];
    if (
      legacyTransport &&
      (def.key === "manner_of_transport_receiving" || def.key === "manner_of_transport_shipping") &&
      !Array.isArray(list)
    ) {
      list = legacyTransport;
    }
    out[def.key] = normalizeOptionList(list, def.defaults);
  }
  return out;
}

/** @param {unknown} raw */
export function sanitizeProductDropdownsPatch(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return normalizeProductDropdowns({});
  /** @type {Record<string, string[]>} */
  const out = {};
  for (const def of Object.values(PRODUCT_DROPDOWN_DEFINITIONS)) {
    if (!Object.prototype.hasOwnProperty.call(raw, def.key)) continue;
    out[def.key] = normalizeOptionList(raw[def.key], def.defaults);
  }
  return normalizeProductDropdowns({ ...normalizeProductDropdowns({}), ...out });
}

/**
 * @param {Record<string, unknown>|null|undefined} settings — merged user settings or draft
 * @param {string} key — PRODUCT_DROPDOWN_DEFINITIONS key
 * @param {{ includeEmpty?: boolean, emptyLabel?: string }} [opts]
 */
export function productDropdownSelectOptions(settings, key, opts = {}) {
  const def = PRODUCT_DROPDOWN_DEFINITIONS[key];
  const lists = normalizeProductDropdowns(settings?.productDropdowns);
  const values = lists[key] || def?.defaults || [];
  const options = values.map((value) => ({ value, label: value }));
  if (opts.includeEmpty === false) return options;
  return [
    {
      value: "",
      label: opts.emptyLabel || def?.placeholder || "Select…",
    },
    ...options,
  ];
}

/**
 * Values only (for validation / normalizeQuoteTypeValue-style helpers).
 * @param {Record<string, unknown>|null|undefined} settings
 * @param {string} key
 */
export function productDropdownValues(settings, key) {
  const lists = normalizeProductDropdowns(settings?.productDropdowns);
  return lists[key] || PRODUCT_DROPDOWN_DEFINITIONS[key]?.defaults || [];
}

/** Product dropdown key for motor receiving vs shipping transport lists. */
export function mannerOfTransportDropdownKey(kind) {
  return kind === "motor_shipping" ? "manner_of_transport_shipping" : "manner_of_transport_receiving";
}
