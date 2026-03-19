import Customer from "@/models/Customer";
import Motor from "@/models/Motor";
import Quote from "@/models/Quote";
import WorkOrder from "@/models/WorkOrder";
import Invoice from "@/models/Invoice";
import InventoryItem from "@/models/InventoryItem";
import Vendor from "@/models/Vendor";
import PurchaseOrder from "@/models/PurchaseOrder";
import Employee from "@/models/Employee";
import LogisticsEntry from "@/models/LogisticsEntry";
import Lead from "@/models/Lead";
import SupportTicket from "@/models/SupportTicket";
import MarketplaceItem from "@/models/MarketplaceItem";
import MarketplaceOrder from "@/models/MarketplaceOrder";
import Policy from "@/models/Policy";
import Listing from "@/models/Listing";

/** Non-admin CRM collections exposed through integration API. */
export const INTEGRATION_COLLECTIONS = {
  customers: { model: Customer, ownerField: "createdByEmail", readOnly: false, strip: ["portalToken"] },
  motors: { model: Motor, ownerField: "createdByEmail", readOnly: false, strip: [] },
  quotes: { model: Quote, ownerField: "createdByEmail", readOnly: false, strip: ["respondToken"] },
  workOrders: { model: WorkOrder, ownerField: "createdByEmail", readOnly: false, strip: [] },
  invoices: { model: Invoice, ownerField: "createdByEmail", readOnly: false, strip: ["customerViewToken"] },
  inventoryItems: { model: InventoryItem, ownerField: "createdByEmail", readOnly: false, strip: [] },
  vendors: { model: Vendor, ownerField: "createdByEmail", readOnly: false, strip: [] },
  purchaseOrders: { model: PurchaseOrder, ownerField: "createdByEmail", readOnly: false, strip: ["vendorShareToken"] },
  employees: { model: Employee, ownerField: "createdByEmail", readOnly: false, strip: ["passwordHash"] },
  logisticsEntries: { model: LogisticsEntry, ownerField: "createdByEmail", readOnly: false, strip: [] },
  leads: { model: Lead, ownerField: "createdByEmail", readOnly: false, strip: [] },
  supportTickets: { model: SupportTicket, ownerField: "createdByEmail", readOnly: false, strip: [] },
  marketplaceItems: { model: MarketplaceItem, ownerField: "createdByEmail", readOnly: false, strip: [] },
  marketplaceOrders: { model: MarketplaceOrder, ownerField: "shopOwnerEmail", readOnly: false, strip: [] },
  policies: { model: Policy, ownerField: "createdByEmail", readOnly: false, strip: [] },
  directoryListings: { model: Listing, ownerField: "email", readOnly: false, strip: ["rejectionReason", "reviewedBy"] },
};

export const INTEGRATION_COLLECTION_NAMES = Object.keys(INTEGRATION_COLLECTIONS);

export function getIntegrationCollection(name) {
  return INTEGRATION_COLLECTIONS[name] || null;
}

export function sanitizeIntegrationDoc(doc, cfg) {
  if (!doc) return null;
  const o = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  const out = { ...o, id: String(o._id || o.id || ""), _id: undefined };
  for (const k of cfg.strip || []) {
    if (k in out) delete out[k];
  }
  return out;
}

