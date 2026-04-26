import type { Metadata } from "next"
import {
  getCitiesWithScenesForViewer,
  getCityFictionsWithScenesForViewer,
} from "@/src/scenes/infrastructure/next/scene.queries"
import { SceneViewer } from "@/components/scenes/scene-viewer"
import { getSiteUrl } from "@/lib/site"

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const siteUrl = getSiteUrl()
  const canonical = `${siteUrl}/${locale}/scenes`
  return {
    title: "Interactive Scenes by City and Fiction",
    description:
      "Explore curated scenes connected to real cities and fictional worlds with a visual scene browser.",
    alternates: {
      canonical,
      languages: {
        en: `${siteUrl}/en/scenes`,
        es: `${siteUrl}/es/scenes`,
      },
    },
    openGraph: {
      title: "Interactive Scenes by City and Fiction",
      description:
        "Explore curated scenes connected to real cities and fictional worlds with a visual scene browser.",
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Interactive Scenes by City and Fiction",
      description:
        "Explore curated scenes connected to real cities and fictional worlds with a visual scene browser.",
    },
    robots: {
      index: false,
      follow: false,
    },
  }
}

export default async function ScenesPage() {
  const cities = await getCitiesWithScenesForViewer()
  const initialCity = cities.length > 0 ? cities[0] : null
  const initialAvailableFictions = initialCity
    ? await getCityFictionsWithScenesForViewer(initialCity.id)
    : []

  return (
    <SceneViewer
      initialCities={cities}
      initialSelectedCity={initialCity}
      initialAvailableFictions={initialAvailableFictions}
    />
  )
}
