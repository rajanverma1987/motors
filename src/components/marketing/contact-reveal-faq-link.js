"use client";

/**
 * Opens the gated ContactReveal modal for a listing (used from FAQ answers).
 */
export default function ContactRevealFaqLink({ shopId, className = "" }) {
  if (!shopId) return null;

  return (
    <button
      type="button"
      className={`font-semibold text-primary underline underline-offset-2 hover:no-underline ${className}`.trim()}
      onClick={() => {
        window.dispatchEvent(
          new CustomEvent("contact-reveal:open", { detail: { shopId: String(shopId) } })
        );
      }}
    >
      View contact info
    </button>
  );
}
