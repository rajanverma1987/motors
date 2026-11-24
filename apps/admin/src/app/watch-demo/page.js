import { notFound } from "next/navigation";

export const metadata = {
  robots: { index: false, follow: false },
};

/** No public demo page. The video opens only from a token link in the email. */
export default function WatchDemoIndexPage() {
  notFound();
}
