import type { MetadataRoute } from "next";
import { LANDING_PAGES } from "@/lib/landing";
import { listArticles, listChallengeRecords, listFirms } from "@/lib/repo";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const STATIC_PATHS = [
  { path: "", priority: 1 },
  { path: "find-my-challenge", priority: 0.95 },
  { path: "challenges", priority: 0.8 },
  { path: "compare", priority: 0.7 },
  { path: "psychology", priority: 0.7 },
  { path: "reviews", priority: 0.6 },
  { path: "tools", priority: 0.6 },
  { path: "tools/drawdown-calculator", priority: 0.55 },
  { path: "tools/challenge-calculator", priority: 0.55 },
  { path: "learn", priority: 0.6 },
  { path: "how-it-works", priority: 0.5 },
  { path: "methodology", priority: 0.5 },
  { path: "review-policy", priority: 0.3 },
  { path: "affiliate-disclosure", priority: 0.3 },
  { path: "about", priority: 0.3 },
  { path: "contact", priority: 0.3 },
  { path: "risk-disclosure", priority: 0.3 },
  { path: "privacy", priority: 0.2 },
  { path: "terms", priority: 0.2 },
  { path: "cookies", priority: 0.2 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map(({ path, priority }) => ({
    url: `${BASE}/${path}`.replace(/\/$/, "") || BASE,
    lastModified: now,
    priority,
  }));

  for (const page of LANDING_PAGES) {
    entries.push({ url: `${BASE}/${page.slug}`, lastModified: now, priority: 0.7 });
  }

  // Only published records reach the sitemap — listChallengeRecords and
  // listFirms filter to published by default.
  for (const challenge of listChallengeRecords()) {
    entries.push({
      url: `${BASE}/challenges/${challenge.slug}`,
      lastModified: new Date(challenge.updated_at),
      priority: 0.75,
    });
  }

  for (const firm of listFirms()) {
    entries.push({
      url: `${BASE}/firms/${firm.slug}`,
      lastModified: new Date(firm.updated_at),
      priority: 0.5,
    });
  }

  for (const article of listArticles()) {
    entries.push({
      url: `${BASE}/learn/${article.slug}`,
      lastModified: new Date(article.updated_at),
      priority: 0.5,
    });
  }

  return entries;
}
