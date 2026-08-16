import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Personal results, the admin area and the outbound redirector have no
      // business in an index.
      disallow: [
        "/admin",
        "/api/",
        "/find-my-challenge/results",
        "/profile",
        "/saved",
        "/outcomes",
      ],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
