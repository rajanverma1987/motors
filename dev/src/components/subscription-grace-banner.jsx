"use client";

/**
 * Sticky grace notice: yellow background, red text (plan).
 */
export default function SubscriptionGraceBanner({ notice }) {
  if (!notice) return null;
  return (
    <div
      role="status"
      className="sticky top-0 z-[60] w-full px-4 py-2 text-center text-sm font-semibold"
      style={{ backgroundColor: "#fde047", color: "#b91c1c" }}
    >
      {notice}
    </div>
  );
}
