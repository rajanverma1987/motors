import TimeClockApp from "@/components/time-clock/time-clock-app";

export const metadata = {
  title: "Time Clock",
  robots: { index: false, follow: false },
};

export default async function TimeClockPage({ params }) {
  const resolved = typeof params?.then === "function" ? await params : params;
  const token = String(resolved?.token || "").trim();
  if (!token) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center p-6 text-sm text-red-700">
        Invalid time clock link.
      </div>
    );
  }
  return <TimeClockApp token={token} />;
}
