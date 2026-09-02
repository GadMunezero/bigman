import { LandingPage } from "@/components/LandingPage";
import { getLandingConfig } from "@/lib/landing";

const config = getLandingConfig("best-100k-prop-firm-challenges")!;

export const metadata = {
  title: config.metaTitle,
  description: config.metaDescription,
  alternates: { canonical: "/best-100k-prop-firm-challenges" },
};

export const dynamic = "force-dynamic";

export default function Page() {
  return <LandingPage config={config} />;
}
