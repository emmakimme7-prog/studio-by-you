import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/portfolio/studio",
          "/portfolio/vote",
          "/portfolio/yt",
          "/studiobyyou",
        ],
      },
    ],
    sitemap: "https://www.studiobyyou.kr/sitemap.xml",
  };
}
