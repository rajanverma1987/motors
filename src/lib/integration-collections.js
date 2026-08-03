import Customer from "@/models/Customer";
import InventoryItem from "@/models/InventoryItem";
import Vendor from "@/models/Vendor";
import Employee from "@/models/Employee";
import SalesPerson from "@/models/SalesPerson";
import SimpleServiceProposal from "@/models/SimpleServiceProposal";
import SimplePurchaseOrder from "@/models/SimplePurchaseOrder";
import LogisticsEntry from "@/models/LogisticsEntry";
import Lead from "@/models/Lead";
import SupportTicket from "@/models/SupportTicket";
import MarketplaceItem from "@/models/MarketplaceItem";
import MarketplaceOrder from "@/models/MarketplaceOrder";
import Policy from "@/models/Policy";
import Listing from "@/models/Listing";
import {
  INTEGRATION_COLLECTION_NAMES,
  INTEGRATION_WEBHOOK_EVENT_NAMES,
} from "@/lib/integration-collection-names";

export { INTEGRATION_COLLECTION_NAMES, INTEGRATION_WEBHOOK_EVENT_NAMES };

/**
 * Simple portal collections exposed through the public integration API + webhooks.
 * Classic Quote / Motor / WorkOrder / Invoice / classic PurchaseOrder are not included.
 */
export const INTEGRATION_COLLECTIONS = {
  customers: { model: Customer, ownerField: "createdByEmail", readOnly: false, strip: ["portalToken"] },
  vendors: { model: Vendor, ownerField: "createdByEmail", readOnly: false, strip: [] },
  inventoryItems: { model: InventoryItem, ownerField: "createdByEmail", readOnly: false, strip: [] },
  employees: { model: Employee, ownerField: "createdByEmail", readOnly: false, strip: ["passwordHash"] },
  salesPersons: { model: SalesPerson, ownerField: "createdByEmail", readOnly: false, strip: [] },
  serviceProposals: {
    model: SimpleServiceProposal,
    ownerField: "createdByEmail",
    readOnly: false,
    strip: [],
  },
  purchaseOrders: {
    model: SimplePurchaseOrder,
    ownerField: "createdByEmail",
    readOnly: false,
    strip: [],
  },
  logisticsEntries: { model: LogisticsEntry, ownerField: "createdByEmail", readOnly: false, strip: [] },
  leads: { model: Lead, ownerField: "createdByEmail", readOnly: false, strip: [] },
  supportTickets: { model: SupportTicket, ownerField: "createdByEmail", readOnly: false, strip: [] },
  marketplaceItems: { model: MarketplaceItem, ownerField: "createdByEmail", readOnly: false, strip: [] },
  marketplaceOrders: { model: MarketplaceOrder, ownerField: "shopOwnerEmail", readOnly: false, strip: [] },
  policies: { model: Policy, ownerField: "createdByEmail", readOnly: false, strip: [] },
  directoryListings: {
    model: Listing,
    ownerField: "email",
    readOnly: false,
    strip: ["rejectionReason", "reviewedBy"],
  },
};

export function getIntegrationCollection(name) {
  return INTEGRATION_COLLECTIONS[name] || null;
}

export function sanitizeIntegrationDoc(doc, cfg) {
  if (!doc) return null;
  const o = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  const out = { ...o, id: String(o._id || o.id || "") };
  delete out._id;
  delete out.__v;
  for (const k of cfg.strip || []) {
    if (k in out) delete out[k];
  }
  return out;
}
