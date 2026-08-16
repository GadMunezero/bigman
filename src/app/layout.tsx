import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader, StickyCta } from "@/components/SiteHeader";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Challenge Fit — Find the prop firm challenge that fits how you trade",
    template: "%s · Challenge Fit",
  },
  description:
    "Answer a few questions about your trading style, budget and the rules that matter to you. We eliminate the challenges that cannot work for you and explain why the rest fit.",
  openGraph: {
    type: "website",
    siteName: "Challenge Fit",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <StickyCta />
      </body>
    </html>
  );
}
