import type { MetadataRoute } from "next"
import { getActiveFictionsCached } from "@/src/fictions/infrastructure/next/fiction.queries"
import { listActivePlacesForSitemapCached } from "@/src/places/infrastructure/next/place.queries"
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
  const [fictions, placeEntries] = await Promise.all([
    getActiveFictionsCached(),
    listActivePlacesForSitemapCached(),
  ])

  const fictionPages: MetadataRoute.Sitemap = fictions.flatMap((fiction) =>
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

  const placePages: MetadataRoute.Sitemap = placeEntries.flatMap((entry) =>
    locales.map((locale) => ({
      url: `${BASE_URL}/${locale}/fictions/${entry.fictionSlug}/places/${entry.placeSlug}`,
      lastModified: new Date(entry.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.7,
      alternates: {
        languages: {
          en: `${BASE_URL}/en/fictions/${entry.fictionSlug}/places/${entry.placeSlug}`,
          es: `${BASE_URL}/es/fictions/${entry.fictionSlug}/places/${entry.placeSlug}`,
        },
      },
    })),
  )

  return [...staticPages, ...fictionPages, ...placePages]
}
