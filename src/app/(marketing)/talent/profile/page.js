import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import JobSeekerProfile from "@/models/JobSeekerProfile";
import { verifyTalentToken, serializeTalentProfile } from "@/lib/talent-auth";
import { TALENT_COOKIE } from "@/lib/talent-constants";
import { marketingPageMetadata } from "@/lib/marketing-page-metadata";
import TalentProfileForm from "@/components/talent/talent-profile-form";

export const metadata = marketingPageMetadata({
  path: "/talent/profile",
  title: "Edit talent profile | IQMotorBase",
  description: "Complete your free motor shop talent profile to get job alerts and apply to careers.",
  index: false,
  follow: false,
});

export default async function TalentProfilePage() {
  const jar = await cookies();
  const token = jar.get(TALENT_COOKIE)?.value || "";
  const session = token ? await verifyTalentToken(token) : null;
  if (!session?.profileId) {
    redirect("/talent/login?next=/talent/profile");
  }

  await connectDB();
  const doc = await JobSeekerProfile.findById(session.profileId).lean();
  if (!doc || doc.status === "banned") {
    redirect("/talent/login");
  }

  const profile = serializeTalentProfile(doc, { includePrivate: true });

  return (
    <div className="mx-auto max-w-[52rem] px-4 py-12 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/talent" className="text-sm text-secondary hover:text-primary">
            Talent directory
          </Link>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-title">Your talent profile</h1>
          <p className="mt-2 text-secondary">
            Free forever. Edit anytime after login. Set hiring availability to Available now, Open to opportunities, or
            Not available for hire. Complete profiles get better matches when shops post jobs.
          </p>
        </div>
        <Link
          href="/careers"
          className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10"
        >
          Browse jobs
        </Link>
      </div>
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <TalentProfileForm initialProfile={profile} />
      </div>
    </div>
  );
}
