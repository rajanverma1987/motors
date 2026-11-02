import mongoose from "mongoose";

/**
 * Resource: which page and which actions are allowed.
 * Stored as { page: string, actions: [string] } (e.g. page "quotes", actions ["view","create","edit"]).
 */
const resourceSchema = new mongoose.Schema(
  {
    page: { type: String, required: true, trim: true },
    actions: [{ type: String, trim: true }],
  },
  { _id: false }
);

const policySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    /** "allow" | "deny" - for now only allow is used */
    effect: { type: String, default: "allow", enum: ["allow", "deny"], trim: true },
    /** "employee" = subjectIds are employee _id strings */
    subjectType: { type: String, default: "employee", enum: ["employee"], trim: true },
    /** IDs of employees this policy applies to */
    subjectIds: [{ type: String, trim: true }],
    /** Pages and actions this policy grants */
    resources: [resourceSchema],
    /** Shop that owns this policy (dashboard user email) */
    createdByEmail: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

policySchema.index({ createdByEmail: 1, createdAt: -1 });

export default mongoose.models.Policy || mongoose.model("Policy", policySchema);
