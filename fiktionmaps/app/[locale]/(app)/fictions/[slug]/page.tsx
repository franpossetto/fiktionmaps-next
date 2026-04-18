import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getFictionByIdCached } from "@/src/fictions/infrastructure/next/fiction.queries"
import { FictionDetailPageClient } from "./fiction-detail-page-client"

type Props = {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const fiction = await getFictionByIdCached(slug)
  if (!fiction || !fiction.active) {
    return { title: "Fiction not found" }
  }
  const title = `${fiction.title} - FiktionMaps`
  const description =
    fiction.description?.slice(0, 160) ||
    `Explore real-world locations from ${fiction.title} on the map.`
  const image = fiction.coverImage?.trim() || fiction.bannerImage?.trim()
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(image && { images: [{ url: image, width: 1200, height: 630, alt: fiction.title }] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image && { images: [image] }),
    },
  }
}

export default async function FictionSlugPage({ params }: Props) {
  const { slug } = await params
  const fiction = await getFictionByIdCached(slug)
  if (!fiction || !fiction.active) {
    notFound()
  }
  return <FictionDetailPageClient fiction={fiction} />
}
