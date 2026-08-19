import { parseSpMoney, roundSpMoney } from "@/lib/simple-service-proposal-form";
import { computePoFormTotals, parsePoMoney, roundPoMoney } from "@/lib/simple-purchase-order-form";

function addrBlock(street, city, state, zip, country) {
  const line1 = String(street || "").trim();
  if (!line1 && !city && !state && !zip) return undefined;
  return {
    Line1: line1 || undefined,
    City: String(city || "").trim() || undefined,
    CountrySubDivisionCode: String(state || "").trim() || undefined,
    PostalCode: String(zip || "").trim() || undefined,
    Country: String(country || "USA").trim() || "USA",
  };
}

/**
 * @param {object} customer
 */
export function mapCustomerToQbo(customer) {
  const displayName =
    String(customer?.companyName || "").trim() ||
    String(customer?.primaryContactName || "").trim() ||
    `Customer ${customer?.customerNumber || customer?.id || ""}`.trim();

  const bill = addrBlock(
    customer?.address,
    customer?.city,
    customer?.state,
    customer?.zipCode,
    customer?.country
  );
  const ship = addrBlock(
    customer?.shippingAddress,
    customer?.shippingCity,
    customer?.shippingState,
    customer?.shippingZipCode,
    customer?.shippingCountry
  );

  return {
    DisplayName: displayName.slice(0, 500),
    CompanyName: String(customer?.companyName || "").trim().slice(0, 100) || undefined,
    PrimaryEmailAddr: customer?.email
      ? { Address: String(customer.email).trim().slice(0, 100) }
      : undefined,
    PrimaryPhone: customer?.phone ? { FreeFormNumber: String(customer.phone).trim().slice(0, 30) } : undefined,
    BillAddr: bill,
    ShipAddr: ship || bill,
    Notes: String(customer?.notes || "").trim().slice(0, 4000) || undefined,
  };
}

/**
 * @param {object} vendor
 */
export function mapVendorToQbo(vendor) {
  const displayName = String(vendor?.name || "").trim() || `Vendor ${vendor?.id || ""}`;
  const bill = addrBlock(vendor?.address, vendor?.city, vendor?.state, vendor?.zipCode, "USA");
  return {
    DisplayName: displayName.slice(0, 500),
    CompanyName: displayName.slice(0, 100),
    PrimaryEmailAddr: vendor?.email
      ? { Address: String(vendor.email).trim().slice(0, 100) }
      : undefined,
    PrimaryPhone: vendor?.phone ? { FreeFormNumber: String(vendor.phone).trim().slice(0, 30) } : undefined,
    BillAddr: bill,
    Notes: String(vendor?.notes || "").trim().slice(0, 4000) || undefined,
  };
}

/**
 * Build invoice SalesItemLineDetail lines using a default income account (AccountBasedExpense style via Item? 
 * For QBO Invoice without Items, use DescriptionOnly or SalesItemLineDetail with ItemRef.
 * Simplest reliable approach for service shops: Account-based? Actually Invoice requires ItemRef OR
 * use DescriptionOnly lines + a discount — QBO prefers SalesItemLineDetail.
 *
 * We use SalesItemLineDetail with a synthetic Item that is Account-based isn't available without Items.
 * Alternative: use "SalesItemLineDetail" with ItemRef to a generic Service item, OR create lines as:
 * `{ DetailType: "SalesItemLineDetail", Amount, Description, SalesItemLineDetail: { UnitPrice, Qty, ItemRef } }`
 *
 * For MVP without Item catalog sync: query/create a Service item "IQMotorBase Service" linked to income account.
 * Mappers only build Description + Amount; sync.js resolves ItemRef.
 */

/**
 * @param {object} invoice - SimpleServiceProposal INVOICE doc
 * @returns {{ description: string, amount: number, qty: number }[]}
 */
export function invoiceLineDrafts(invoice) {
  /** @type {{ description: string, amount: number, qty: number }[]} */
  const lines = [];
  for (const s of Array.isArray(invoice?.scopeDetails) ? invoice.scopeDetails : []) {
    const desc = String(s?.description || "").trim();
    const amount = roundSpMoney(parseSpMoney(s?.price));
    if (!desc && amount === 0) continue;
    lines.push({ description: desc || "Scope", amount, qty: 1 });
  }
  for (const o of Array.isArray(invoice?.otherItems) ? invoice.otherItems : []) {
    const desc = String(o?.description || "").trim();
    const qty = Math.max(1, Number.parseFloat(String(o?.qty || "1").replace(/[^0-9.-]/g, "")) || 1);
    const unit = roundSpMoney(parseSpMoney(o?.price));
    const amount = roundSpMoney(unit * qty);
    if (!desc && amount === 0) continue;
    lines.push({ description: desc || "Item", amount, qty });
  }
  if (!lines.length) {
    const total = roundSpMoney(
      parseSpMoney(invoice?.total ?? invoice?.proposalTotal ?? invoice?.grandTotal)
    );
    if (total > 0) {
      lines.push({ description: String(invoice?.documentNumber || "Invoice").trim() || "Invoice", amount: total, qty: 1 });
    }
  }
  return lines;
}

/**
 * @param {object} invoice
 * @param {string} customerQboId
 * @param {string} itemQboId - Service item Id
 * @param {object} [existing] - existing Invoice for SyncToken update
 */
export function mapInvoiceToQbo(invoice, customerQboId, itemQboId, existing) {
  const drafts = invoiceLineDrafts(invoice);
  const Line = drafts.map((d, i) => ({
    Id: existing?.Line?.[i]?.Id,
    DetailType: "SalesItemLineDetail",
    Amount: d.amount,
    Description: d.description.slice(0, 4000),
    SalesItemLineDetail: {
      ItemRef: { value: String(itemQboId) },
      Qty: d.qty,
      UnitPrice: roundSpMoney(d.amount / (d.qty || 1)),
    },
  }));

  const docNum = String(invoice?.documentNumber || "").trim().slice(0, 21);
  const txnDate =
    String(invoice?.invoiceSubmitDate || invoice?.dateCreated || invoice?.date || "")
      .slice(0, 10) || undefined;

  const payload = {
    CustomerRef: { value: String(customerQboId) },
    Line,
    DocNumber: docNum || undefined,
    TxnDate: txnDate,
    PrivateNote: String(invoice?.internalNotes || "").trim().slice(0, 4000) || undefined,
  };
  if (existing?.Id) {
    payload.Id = existing.Id;
    payload.SyncToken = existing.SyncToken;
    payload.sparse = true;
  }
  return payload;
}

/**
 * @param {object} payment - local payment row
 * @param {string} customerQboId
 * @param {string} invoiceQboId
 * @param {number} amount
 */
export function mapPaymentToQbo(payment, customerQboId, invoiceQboId, amount) {
  const txnDate = String(payment?.date || "").slice(0, 10) || undefined;
  return {
    CustomerRef: { value: String(customerQboId) },
    TotalAmt: roundSpMoney(amount),
    TxnDate: txnDate,
    PaymentRefNum: String(payment?.reference || payment?.id || "").trim().slice(0, 21) || undefined,
    PrivateNote: String(payment?.notes || payment?.method || "").trim().slice(0, 4000) || undefined,
    Line: [
      {
        Amount: roundSpMoney(amount),
        LinkedTxn: [{ TxnId: String(invoiceQboId), TxnType: "Invoice" }],
      },
    ],
  };
}

/**
 * @param {object} po
 * @param {string} vendorQboId
 * @param {string} expenseAccountId
 * @param {object} [existing]
 */
export function mapBillToQbo(po, vendorQboId, expenseAccountId, existing) {
  const lines = Array.isArray(po?.lineItems) ? po.lineItems : [];
  const Line = [];
  for (const line of lines) {
    const desc = String(line?.itemName || "").trim();
    const amount = roundPoMoney(
      parsePoMoney(line?.grandTotal ?? line?.total ?? line?.price)
    );
    if (!desc && amount === 0) continue;
    Line.push({
      DetailType: "AccountBasedExpenseLineDetail",
      Amount: amount,
      Description: (desc || "PO line").slice(0, 4000),
      AccountBasedExpenseLineDetail: {
        AccountRef: { value: String(expenseAccountId) },
      },
    });
  }
  if (!Line.length) {
    const totals = computePoFormTotals(po?.lineItems, po?.shippingCharge);
    const amt = roundPoMoney(totals.grandTotal || parsePoMoney(po?.grandTotal));
    if (amt > 0) {
      Line.push({
        DetailType: "AccountBasedExpenseLineDetail",
        Amount: amt,
        Description: String(po?.poNumber || "Purchase Order").trim() || "Purchase Order",
        AccountBasedExpenseLineDetail: {
          AccountRef: { value: String(expenseAccountId) },
        },
      });
    }
  }

  const shipping = roundPoMoney(parsePoMoney(po?.shippingCharge));
  if (shipping > 0) {
    Line.push({
      DetailType: "AccountBasedExpenseLineDetail",
      Amount: shipping,
      Description: "Shipping",
      AccountBasedExpenseLineDetail: {
        AccountRef: { value: String(expenseAccountId) },
      },
    });
  }

  const payload = {
    VendorRef: { value: String(vendorQboId) },
    Line,
    DocNumber: String(po?.poNumber || "").trim().slice(0, 21) || undefined,
    TxnDate: String(po?.poCutDate || "").slice(0, 10) || undefined,
    DueDate: String(po?.dueDate || "").slice(0, 10) || undefined,
    PrivateNote: String(po?.comments || "").trim().slice(0, 4000) || undefined,
  };
  if (existing?.Id) {
    payload.Id = existing.Id;
    payload.SyncToken = existing.SyncToken;
    payload.sparse = true;
  }
  return payload;
}

/**
 * @param {object} payment
 * @param {string} vendorQboId
 * @param {string} billQboId
 * @param {number} amount
 * @param {string} [bankAccountId] - optional; QBO may require AP bank account
 */
export function mapBillPaymentToQbo(payment, vendorQboId, billQboId, amount, bankAccountId) {
  const payload = {
    VendorRef: { value: String(vendorQboId) },
    TotalAmt: roundPoMoney(amount),
    TxnDate: String(payment?.date || "").slice(0, 10) || undefined,
    PrivateNote: String(payment?.notes || payment?.method || "").trim().slice(0, 4000) || undefined,
    Line: [
      {
        Amount: roundPoMoney(amount),
        LinkedTxn: [{ TxnId: String(billQboId), TxnType: "Bill" }],
      },
    ],
  };
  if (bankAccountId) {
    payload.CheckPayment = {
      BankAccountRef: { value: String(bankAccountId) },
    };
    payload.PayType = "Check";
  }
  return payload;
}
