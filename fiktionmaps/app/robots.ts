import type { MetadataRoute } from "next"

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fiktions.com"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/*/admin/", "/*/profile/", "/*/settings/", "/*/onboarding/"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
