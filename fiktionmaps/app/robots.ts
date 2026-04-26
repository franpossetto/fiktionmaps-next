import type { MetadataRoute } from "next"
import { getSiteUrl } from "@/lib/site"

const BASE_URL = getSiteUrl()

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/*/admin/",
          "/*/profile/",
          "/*/settings/",
          "/*/onboarding/",
          "/*/login",
          "/*/username",
          "/api/",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
