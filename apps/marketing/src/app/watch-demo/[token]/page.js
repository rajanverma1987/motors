import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import ListingMarketingEmail from "@/models/ListingMarketingEmail";
import { getDemoBookingUrl } from "@/lib/demo-booking-url";
import WatchDemoPlayer from "./watch-demo-player";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Watch the demo | 3PhaseFlow",
  robots: { index: false, follow: false },
};

export default async function WatchDemoPage({ params }) {
  const resolved = typeof params?.then === "function" ? await params : params;
  const token = String(resolved?.token || "").trim();
  if (!token || token.length < 16) notFound();

  await connectDB();
  const doc = await ListingMarketingEmail.findOne({ watchToken: token, status: "sent" })
    .select("_id demoPageOpenedAt")
    .lean();
  if (!doc) notFound();

  if (!doc.demoPageOpenedAt) {
    await ListingMarketingEmail.updateOne(
      { _id: doc._id, demoPageOpenedAt: null },
      {
        $set: { demoPageOpenedAt: new Date() },
        $push: { events: { $each: [{ type: "demo.page", at: new Date() }], $slice: -40 } },
      }
    );
  }

  return <WatchDemoPlayer token={token} bookingUrl={getDemoBookingUrl()} />;
}
