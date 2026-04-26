import type { Metadata } from "next"
import { getSiteUrl } from "@/lib/site"

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const siteUrl = getSiteUrl()
  const canonical = `${siteUrl}/${locale}/map`
  return {
    title: "Map of Fiction Locations",
    description:
      "Discover real-world places tied to movies and books on an interactive map with city and fiction filters.",
    alternates: {
      canonical,
      languages: {
        en: `${siteUrl}/en/map`,
        es: `${siteUrl}/es/map`,
      },
    },
    openGraph: {
      title: "Map of Fiction Locations",
      description:
        "Discover real-world places tied to movies and books on an interactive map with city and fiction filters.",
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Map of Fiction Locations",
      description:
        "Discover real-world places tied to movies and books on an interactive map with city and fiction filters.",
    },
  }
}

export default async function MapLayout({ children }: Props) {
  return children
}
