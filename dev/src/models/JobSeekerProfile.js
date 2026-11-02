import mongoose from "mongoose";
import { TALENT_AVAILABILITY, TALENT_EXPERIENCE_LEVELS, TALENT_STATUS } from "@/lib/talent-constants";

const jobSeekerProfileSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    emailVerifiedAt: { type: Date, default: null },
    slug: { type: String, required: true, unique: true, trim: true, index: true },
    fullName: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    headline: { type: String, default: "", trim: true },
    bio: { type: String, default: "" },
    photoUrl: { type: String, default: "" },
    city: { type: String, default: "", trim: true },
    state: { type: String, default: "", trim: true, uppercase: true },
    preferredAreas: { type: [String], default: [] },
    willingToRelocate: { type: Boolean, default: false },
    availability: {
      type: String,
      enum: TALENT_AVAILABILITY,
      default: "open",
    },
    yearsExperience: { type: Number, default: 0 },
    experienceLevel: {
      type: String,
      enum: TALENT_EXPERIENCE_LEVELS.map((o) => o.value),
      default: "entry",
    },
    skills: { type: [String], default: [] },
    roles: { type: [String], default: [] },
    employmentTypes: { type: [String], default: [] },
    salaryExpectation: { type: String, default: "" },
    workAuthorization: { type: String, default: "" },
    linkedinUrl: { type: String, default: "" },
    portfolioUrl: { type: String, default: "" },
    resumeUrl: { type: String, default: "" },
    profileScore: { type: Number, default: 0 },
    status: {
      type: String,
      enum: TALENT_STATUS,
      default: "active",
      index: true,
    },
    jobAlertsEnabled: { type: Boolean, default: true },
    unsubscribeToken: { type: String, default: "" },
  },
  { timestamps: true }
);

jobSeekerProfileSchema.index({ status: 1, availability: 1, state: 1 });
jobSeekerProfileSchema.index({ skills: 1 });
jobSeekerProfileSchema.index({ preferredAreas: 1 });

export default mongoose.models.JobSeekerProfile ||
  mongoose.model("JobSeekerProfile", jobSeekerProfileSchema);
