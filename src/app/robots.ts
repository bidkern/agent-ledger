import type { MetadataRoute } from "next";
import { getAppUrlString } from "@/data/runtime";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getAppUrlString();

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/request-access", "/security", "/privacy", "/terms"],
      disallow: ["/login", "/workspace", "/api"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
