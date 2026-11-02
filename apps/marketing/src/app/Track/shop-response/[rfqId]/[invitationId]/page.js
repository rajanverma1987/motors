import TrackShopResponseClient from "@/components/track/shop-response-client";

export const metadata = {
  title: { absolute: "Respond to a motor repair request" },
  robots: { index: false, follow: false },
};

export default async function TrackShopResponsePage({ params }) {
  const resolved = await params;
  return (
    <TrackShopResponseClient
      rfqId={String(resolved?.rfqId || "")}
      invitationId={String(resolved?.invitationId || "")}
    />
  );
}
