import type { MetadataRoute } from "next";

import { siteUrlFor } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/collections",
        "/curation/",
        "/forgot-password",
        "/moderation",
        "/profile",
        "/reset-password",
        "/settings",
        "/sign-in",
      ],
    },
    sitemap: siteUrlFor("/sitemap.xml"),
  };
}
