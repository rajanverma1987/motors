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
    /** Bcrypt hash of password for employee login; never store plain text */
    passwordHash: { type: String, default: "", select: false },
    /** Shop that owns this employee (dashboard user email) */
    createdByEmail: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

employeeSchema.index({ createdByEmail: 1, createdAt: -1 });

export default mongoose.models.Employee || mongoose.model("Employee", employeeSchema);
