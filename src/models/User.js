import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    shopName: { type: String, default: "", trim: true },
    contactName: { type: String, default: "", trim: true },
    canLogin: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/* email: unique: true already creates an index */

export default mongoose.models.User || mongoose.model("User", userSchema);
