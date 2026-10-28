import JobSeekerProfile from "@/models/JobSeekerProfile";
import JobPosting from "@/models/JobPosting";
import { seekerMatchesJobLocation } from "@/lib/talent-location";
import { sendTalentJobAlertEmail } from "@/lib/talent-email";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { TALENT_ALERT_BATCH_CAP } from "@/lib/talent-constants";

/**
 * Fire-and-forget: email location-matched active seekers when a job goes live.
 * Sets seekerAlertsSentAt so repeat edits do not re-blast.
 * @param {string|import("mongoose").Types.ObjectId} jobId
 * @param {Request} [request]
 */
export async function maybeSendJobSeekerAlertsForPosting(jobId, request) {
  if (!jobId) return { sent: 0, skipped: true };
  try {
    const job = await JobPosting.findById(jobId).lean();
    if (!job) return { sent: 0, skipped: true };
    if (job.status !== "open" || !job.listedOnMarketingSite) {
      return { sent: 0, skipped: true };
    }
    if (job.seekerAlertsSentAt) {
      return { sent: 0, skipped: true, alreadySent: true };
    }

    const seekers = await JobSeekerProfile.find({
      status: "active",
      jobAlertsEnabled: true,
      emailVerifiedAt: { $ne: null },
      email: { $exists: true, $nin: [null, ""] },
    })
      .select("email fullName state preferredAreas willingToRelocate")
      .limit(TALENT_ALERT_BATCH_CAP * 2)
      .lean();

    const matched = seekers
      .filter((s) => seekerMatchesJobLocation(s, job.location))
      .slice(0, TALENT_ALERT_BATCH_CAP);

    const baseUrl = getPublicSiteUrl(request);
    const jobUrl = `${baseUrl}/careers/${encodeURIComponent(job.slug)}`;
    let sent = 0;
    for (const seeker of matched) {
      const result = await sendTalentJobAlertEmail({
        to: seeker.email,
        seekerName: seeker.fullName,
        jobTitle: job.title,
        shopName: "",
        location: job.location || "",
        jobUrl,
        request,
      });
      if (result?.ok) sent += 1;
    }

    await JobPosting.updateOne(
      { _id: job._id, seekerAlertsSentAt: null },
      { $set: { seekerAlertsSentAt: new Date(), seekerAlertsSentCount: sent } }
    );

    if (matched.length >= TALENT_ALERT_BATCH_CAP) {
      console.warn(
        `Talent job alerts capped at ${TALENT_ALERT_BATCH_CAP} for job ${job._id} (${job.slug})`
      );
    }

    return { sent, matched: matched.length };
  } catch (err) {
    console.error("Talent job alert error:", err);
    return { sent: 0, error: err?.message || "alert failed" };
  }
}

/**
 * Schedule alerts without blocking the HTTP response.
 */
export function scheduleJobSeekerAlerts(jobId, request) {
  void maybeSendJobSeekerAlertsForPosting(jobId, request);
}
