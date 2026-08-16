import { LandingPage } from "@/components/LandingPage";
import { getLandingConfig } from "@/lib/landing";

const config = getLandingConfig("best-prop-firm-challenges-for-day-trading")!;

export const metadata = {
  title: config.metaTitle,
  description: config.metaDescription,
  alternates: { canonical: "/best-prop-firm-challenges-for-day-trading" },
};

export const dynamic = "force-dynamic";

export default function Page() {
  return <LandingPage config={config} />;
}
