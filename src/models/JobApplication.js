import mongoose from "mongoose";

const jobApplicationSchema = new mongoose.Schema(
  {
    jobPostingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobPosting",
      required: true,
      index: true,
    },
    ownerEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    applicantName: { type: String, required: true, trim: true },
    applicantEmail: { type: String, required: true, lowercase: true, trim: true },
    applicantPhone: { type: String, default: "" },
    experienceText: { type: String, default: "" },
    status: { type: String, enum: ["new", "reviewed", "archived"], default: "new" },
  },
  { timestamps: true }
);

jobApplicationSchema.index({ jobPostingId: 1, createdAt: -1 });

export default mongoose.models.JobApplication || mongoose.model("JobApplication", jobApplicationSchema);
