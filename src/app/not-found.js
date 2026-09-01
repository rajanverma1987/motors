import Navbar from "@/components/marketing/Navbar";
import Footer from "@/components/marketing/Footer";
import NotFoundContent from "@/components/marketing/not-found-content";

export const metadata = {
  title: "Page not found",
  description:
    "The page you requested is not on IQMotorBase. Find motor repair shops, rewinding cost guides, or shop management software from here.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <div className="marketing-shell flex min-h-screen flex-col bg-bg pb-[env(safe-area-inset-bottom)]">
      <a href="#main-content" className="marketing-skip-link">
        Skip to main content
      </a>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 outline-none">
        <NotFoundContent />
      </main>
      <Footer />
    </div>
  );
}
