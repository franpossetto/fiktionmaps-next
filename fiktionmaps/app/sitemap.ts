import type { MetadataRoute } from "next"
import { getActiveFictionsCached } from "@/src/fictions/infrastructure/next/fiction.queries"
import { getSiteUrl } from "@/lib/site"

const BASE_URL = getSiteUrl()

const locales = ["en", "es"] as const
const staticPaths = [
  { path: "", priority: 1, changeFrequency: "weekly" as const },
  { path: "/fictions", priority: 0.9, changeFrequency: "daily" as const },
  { path: "/map", priority: 0.8, changeFrequency: "weekly" as const },
]

const staticPages: MetadataRoute.Sitemap = locales.flatMap((locale) =>
  staticPaths.map((entry) => ({
    url: `${BASE_URL}/${locale}${entry.path}`,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
    alternates: {
      languages: {
        en: `${BASE_URL}/en${entry.path}`,
        es: `${BASE_URL}/es${entry.path}`,
      },
    },
  })),
)

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fictions = await getActiveFictionsCached()

  const fictionPages: MetadataRoute.Sitemap = fictions
    .filter((fiction) => fiction.slug)
    .flatMap((fiction) =>
      locales.map((locale) => ({
        url: `${BASE_URL}/${locale}/fictions/${fiction.slug}`,
        lastModified: new Date(fiction.updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.8,
        alternates: {
          languages: {
            en: `${BASE_URL}/en/fictions/${fiction.slug}`,
            es: `${BASE_URL}/es/fictions/${fiction.slug}`,
          },
        },
      })),
    )

  return [...staticPages, ...fictionPages]
}
