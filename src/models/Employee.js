import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, default: "", trim: true },
    /** Role e.g. Technician, Lead, Office */
    role: { type: String, default: "", trim: true },
    /** Contact phone */
    phone: { type: String, default: "", trim: true },
    /** If true, employee can be granted login access to the CRM (full dashboard access) */
    canLogin: { type: Boolean, default: false },
    /** If true, employee may sign in to the Technician App (mobile); independent from full CRM login */
    technicianAppAccess: { type: Boolean, default: false },
    /** Bcrypt hash of password for employee login; never store plain text */
    passwordHash: { type: String, default: "", select: false },
    /** Shop that owns this employee (dashboard user email) */
    createdByEmail: { type: String, required: true, trim: true },
    sourceSystem: { type: String, default: "manual_csv", trim: true },
    externalRef: { type: String, default: "", trim: true },
    importBatchId: { type: String, default: "", trim: true },
    importedAt: { type: Date, default: null },
    importStatus: { type: String, default: "", trim: true },
    /** Expo push tokens for Technician App (ExponentPushToken[…]) */
    expoPushTokens: [
      {
        token: { type: String, required: true, trim: true },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

employeeSchema.index({ createdByEmail: 1, createdAt: -1 });
employeeSchema.index(
  { createdByEmail: 1, sourceSystem: 1, externalRef: 1 },
  {
    unique: true,
    partialFilterExpression: { externalRef: { $type: "string", $gt: "" } },
  }
);

// Next.js / Turbopack can keep a cached model with an older schema; strict mode then drops new paths on save.
const existingEmployee = mongoose.models.Employee;
if (
  existingEmployee &&
  (existingEmployee.schema.path("technicianAppAccess") == null ||
    existingEmployee.schema.path("expoPushTokens") == null)
) {
  delete mongoose.models.Employee;
}

export default mongoose.models.Employee || mongoose.model("Employee", employeeSchema);
