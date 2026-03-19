import { connectDB } from "@/lib/db";
import Employee from "@/models/Employee";
import { sendExpoPushMessages } from "@/lib/expo-push";

/**
 * Notify assignee when a work order is newly assigned (create or technician change).
 * Fire-and-forget from API routes; errors are logged only.
 *
 * @param {object} opts
 * @param {string} opts.shopEmail - dashboard owner email (createdByEmail)
 * @param {string} opts.assigneeEmployeeId - Employee _id string
 * @param {string} opts.workOrderId
 * @param {string} [opts.workOrderNumber]
 * @param {string} [opts.companyName]
 * @param {string} [opts.quoteRfqNumber]
 */
export async function notifyTechnicianWorkOrderAssigned(opts) {
  const shopEmail = String(opts.shopEmail || "")
    .trim()
    .toLowerCase();
  const assigneeEmployeeId = String(opts.assigneeEmployeeId || "").trim();
  const workOrderId = String(opts.workOrderId || "").trim();
  if (!shopEmail || !assigneeEmployeeId || !workOrderId) return;

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

    const woNum = String(opts.workOrderNumber || "").trim() || "Work order";
    const company = String(opts.companyName || "").trim();
    const rfq = String(opts.quoteRfqNumber || "").trim();
    const title = "Work order assigned";
    const bodyParts = [woNum];
    if (company) bodyParts.push(company);
    if (rfq) bodyParts.push(`RFQ ${rfq}`);
    const body = bodyParts.join(" · ");

    await sendExpoPushMessages(
      tokens.map((to) => ({
        to,
        title,
        body,
        data: {
          type: "work_order_assigned",
          workOrderId,
          workOrderNumber: woNum,
        },
      }))
    );
  } catch (e) {
    console.error("notifyTechnicianWorkOrderAssigned:", e);
  }
}
