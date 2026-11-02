/**
 * Public API / webhook collection ids for the Simple portal.
 * Kept free of Mongoose imports so marketing docs can reuse safely.
 */
export const INTEGRATION_COLLECTION_NAMES = [
  "customers",
  "vendors",
  "inventoryItems",
  "employees",
  "salesPersons",
  "serviceProposals",
  "purchaseOrders",
  "logisticsEntries",
  "leads",
  "supportTickets",
  "marketplaceItems",
  "marketplaceOrders",
  "policies",
  "directoryListings",
];

export const INTEGRATION_WEBHOOK_EVENT_NAMES = INTEGRATION_COLLECTION_NAMES.flatMap((c) => [
  `crm.${c}.created`,
  `crm.${c}.updated`,
  `crm.${c}.deleted`,
]);
