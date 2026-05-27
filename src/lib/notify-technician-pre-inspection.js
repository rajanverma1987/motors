import { connectDB } from "@/lib/db";
import Employee from "@/models/Employee";
import { sendExpoPushMessages } from "@/lib/expo-push";

/**
 * Notify assignee when a Write-Up RFQ is assigned for pre-inspection (no work order yet).
 * Fire-and-forget from API routes; errors are logged only.
 *
 * @param {object} opts
 * @param {string} opts.shopEmail
 * @param {string} opts.assigneeEmployeeId
 * @param {string} opts.quoteId
 * @param {string} [opts.rfqNumber]
 * @param {string} [opts.companyName]
 */
export async function notifyTechnicianPreInspectionAssigned(opts) {
  const shopEmail = String(opts.shopEmail || "")
    .trim()
    .toLowerCase();
  const assigneeEmployeeId = String(opts.assigneeEmployeeId || "").trim();
  const quoteId = String(opts.quoteId || "").trim();
  if (!shopEmail || !assigneeEmployeeId || !quoteId) return;

  try {
    await connectDB();
    const emp = await Employee.findOne({
      _id: assigneeEmployeeId,
      createdByEmail: shopEmail,
    })
      .select({ expoPushTokens: 1, name: 1 })
      .lean();

    const raw = Array.isArray(emp?.expoPushTokens) ? emp.expoPushTokens : [];
    const tokens = [
      ...new Set(
        raw
          .map((t) => (typeof t === "string" ? t : t?.token))
          .filter(Boolean)
          .map((t) => String(t).trim())
      ),
    ];
    if (!tokens.length) return;

    const rfq = String(opts.rfqNumber || "").trim() || "Write-Up RFQ";
    const company = String(opts.companyName || "").trim();
    const title = "Pre-inspection assigned";
    const body = company ? `${rfq} · ${company}` : rfq;

    await sendExpoPushMessages(
      tokens.map((to) => ({
        to,
        title,
        body,
        data: {
          type: "pre_inspection_assigned",
          quoteId,
          rfqNumber: rfq,
        },
      }))
    );
  } catch (e) {
    console.error("notifyTechnicianPreInspectionAssigned:", e);
  }
}
