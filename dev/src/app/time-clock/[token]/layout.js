export async function generateMetadata({ params }) {
  const resolved = typeof params?.then === "function" ? await params : params;
  const token = String(resolved?.token || "").trim();
  return {
    title: "Time Clock",
    robots: { index: false, follow: false },
    manifest: token ? `/time-clock/${encodeURIComponent(token)}/manifest.webmanifest` : undefined,
    appleWebApp: {
      capable: true,
      title: "Time Clock",
      statusBarStyle: "default",
    },
  };
}

export default function TimeClockTokenLayout({ children }) {
  return children;
}
