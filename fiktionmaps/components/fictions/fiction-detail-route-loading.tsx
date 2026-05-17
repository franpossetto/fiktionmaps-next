"use client"

import { useParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { isUuidString } from "@/lib/validation/primitives"

function slugSegmentToDisplayTitle(slug: string): string | null {
  if (!slug || isUuidString(slug)) return null
  try {
    return decodeURIComponent(slug).replace(/-/g, " ").trim() || null
  } catch {
    return slug.replace(/-/g, " ").trim() || null
  }
}

export function FictionDetailRouteLoading() {
  const params = useParams<{ slug?: string }>()
  const t = useTranslations("Fictions")
  const slug = typeof params?.slug === "string" ? params.slug : ""
  const titleFromSlug = slugSegmentToDisplayTitle(slug)

  const label =
    titleFromSlug != null ? t("loadingFictionDetail", { title: titleFromSlug }) : t("loadingFictionFallback")

  return <>{label}</>
}
