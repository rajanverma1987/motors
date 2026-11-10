import ShopLoginPage from "@/components/shop/shop-login-page";

export const metadata = {
  title: "Sign in | 3PhaseFlow",
  description: "Sign in to your 3PhaseFlow motor repair shop portal.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function HomePage() {
  return <ShopLoginPage />;
}
