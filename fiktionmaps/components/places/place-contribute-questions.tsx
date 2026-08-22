"use client"

import { useTranslations } from "next-intl"
import { Clapperboard, Layers, Link2, type LucideIcon } from "lucide-react"
import { Link } from "@/i18n/navigation"

type PlaceContributeQuestionsProps = {
  fictionId: string
  placeId: string
}

/** Footer chips; every wizard opens with this place and fiction already selected. */
export function PlaceContributeQuestions({ fictionId, placeId }: PlaceContributeQuestionsProps) {
  const t = useTranslations("Fictions")

  const query = `?fictionId=${fictionId}&placeId=${placeId}`
  const questions: { key: string; href: string; label: string; icon: LucideIcon }[] = [
    {
      key: "add_scene",
      href: `/contribute/scene${query}`,
      label: t("placeDetailAddSceneQuestion"),
      icon: Clapperboard,
    },
    {
      key: "shared",
      href: `/contribute/place-relationship${query}`,
      label: t("placeDetailRelatedSharedQuestion"),
      icon: Link2,
    },
    {
      key: "composite",
      href: `/contribute/place-relationship${query}`,
      label: t("placeDetailRelatedCompositeQuestion"),
      icon: Layers,
    },
  ]

  return (
    <footer className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-6">
      {questions.map(({ key, href, label, icon: Icon }) => (
        <Link
          key={key}
          href={href}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
        >
          <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {label}
        </Link>
      ))}
    </footer>
  )
}
