import mongoose from "mongoose";

/** Platform admin operators (admin.3phaseflow.com). */
const adminUserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: "", trim: true },
    /** owner = everything; admin = ops (listings, leads, tenants, Open shop) */
    role: { type: String, enum: ["owner", "admin"], default: "admin", index: true },
    canLogin: { type: Boolean, default: true },
    invitedByEmail: { type: String, default: "", trim: true, lowercase: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.AdminUser || mongoose.model("AdminUser", adminUserSchema);
