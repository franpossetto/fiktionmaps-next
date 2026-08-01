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
          "/*/contributions/",
          "/*/profile/",
          "/*/u/",
          "/*/settings/",
          "/*/onboarding/",
          "/*/login",
          "/*/auth/",
          "/*/username",
          "/api/",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
