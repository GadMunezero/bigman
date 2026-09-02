import { LandingPage } from "@/components/LandingPage";
import { getLandingConfig } from "@/lib/landing";

const config = getLandingConfig("prop-firm-challenges-with-no-consistency-rule")!;

export const metadata = {
  title: config.metaTitle,
  description: config.metaDescription,
  alternates: { canonical: "/prop-firm-challenges-with-no-consistency-rule" },
};

export const dynamic = "force-dynamic";

export default function Page() {
  return <LandingPage config={config} />;
}
