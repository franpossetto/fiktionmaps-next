import type { MetadataRoute } from "next"
import { getActiveFictionsCached } from "@/src/fictions/infrastructure/next/fiction.queries"

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fiktionmaps.com"

const staticPages: MetadataRoute.Sitemap = [
  {
    url: `${BASE_URL}/en`,
    changeFrequency: "weekly",
    priority: 1,
    alternates: { languages: { en: `${BASE_URL}/en`, es: `${BASE_URL}/es` } },
  },
  {
    url: `${BASE_URL}/en/fictions`,
    changeFrequency: "daily",
    priority: 0.9,
    alternates: { languages: { en: `${BASE_URL}/en/fictions`, es: `${BASE_URL}/es/fictions` } },
  },
  {
    url: `${BASE_URL}/en/map`,
    changeFrequency: "weekly",
    priority: 0.8,
    alternates: { languages: { en: `${BASE_URL}/en/map`, es: `${BASE_URL}/es/map` } },
  },
  {
    url: `${BASE_URL}/en/scenes`,
    changeFrequency: "weekly",
    priority: 0.7,
    alternates: { languages: { en: `${BASE_URL}/en/scenes`, es: `${BASE_URL}/es/scenes` } },
  },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const fictions = await getActiveFictionsCached()

  const fictionPages: MetadataRoute.Sitemap = fictions
    .filter((fiction) => fiction.slug)
    .map((fiction) => ({
      url: `${BASE_URL}/en/fictions/${fiction.slug}`,
      lastModified: new Date(fiction.updated_at),
      changeFrequency: "weekly",
      priority: 0.8,
      alternates: {
        languages: {
          en: `${BASE_URL}/en/fictions/${fiction.slug}`,
          es: `${BASE_URL}/es/fictions/${fiction.slug}`,
        },
      },
    }))

  return [...staticPages, ...fictionPages]
}
