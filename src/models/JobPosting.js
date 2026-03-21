import mongoose from "mongoose";

const jobPostingSchema = new mongoose.Schema(
  {
    ownerEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    /** URL segment for /careers/[slug] — unique globally */
    slug: { type: String, required: true, unique: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    location: { type: String, default: "" },
    department: { type: String, default: "" },
    employmentType: {
      type: String,
      enum: ["full_time", "part_time", "contract", "temporary", "internship"],
      default: "full_time",
    },
    experienceLevel: {
      type: String,
      enum: ["entry", "mid", "senior", "lead", "any"],
      default: "any",
    },
    salaryDisplay: { type: String, default: "" },
    responsibilities: { type: String, default: "" },
    qualifications: { type: String, default: "" },
    benefits: { type: String, default: "" },
    /** draft = CRM only; open = accepting; closed = filled or paused */
    status: { type: String, enum: ["draft", "open", "closed"], default: "draft" },
    /** When true and status is open, job appears on public /careers */
    listedOnMarketingSite: { type: Boolean, default: true },
  },
  { timestamps: true }
);

jobPostingSchema.index({ ownerEmail: 1, status: 1, updatedAt: -1 });
jobPostingSchema.index({ listedOnMarketingSite: 1, status: 1 });

export default mongoose.models.JobPosting || mongoose.model("JobPosting", jobPostingSchema);
