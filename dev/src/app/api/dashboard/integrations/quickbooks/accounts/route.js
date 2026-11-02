import { NextResponse } from "next/server";
import { getPortalUserFromRequest } from "@/lib/auth-portal";
import { getActiveConnection, listChartOfAccounts } from "@/lib/quickbooks/client";

export async function GET(request) {
  try {
    const user = await getPortalUserFromRequest(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const email = user.email.trim().toLowerCase();
    const conn = await getActiveConnection(email);
    if (!conn) {
      return NextResponse.json({ error: "QuickBooks is not connected" }, { status: 400 });
    }
    const accounts = await listChartOfAccounts(email);
    const income = accounts.filter(
      (a) =>
        /income|revenue/i.test(a.accountType) ||
        /income|revenue/i.test(a.classification) ||
        /income/i.test(a.accountSubType)
    );
    const expense = accounts.filter(
      (a) =>
        /expense|cost of goods/i.test(a.accountType) ||
        /expense/i.test(a.classification) ||
        /expense|cogs/i.test(a.accountSubType)
    );
    return NextResponse.json({
      accounts,
      incomeAccounts: income.length ? income : accounts,
      expenseAccounts: expense.length ? expense : accounts,
    });
  } catch (err) {
    console.error("QuickBooks accounts:", err);
    return NextResponse.json({ error: err.message || "Failed to load accounts" }, { status: 500 });
  }
}
