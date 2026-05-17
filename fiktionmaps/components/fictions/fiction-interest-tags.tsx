"use client"

import { useTranslations } from "next-intl"

export type FictionInterestTagItem = { id: string; label: string }

export function FictionInterestTags({
  tags,
  className,
}: {
  tags: FictionInterestTagItem[]
  className?: string
}) {
  const t = useTranslations("Fictions")
  if (tags.length === 0) return null
  return (
    <section className={className}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">{t("interestsHeading")}</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {tags.map(({ id, label }) => (
          <li key={id} className="text-sm font-normal lowercase text-muted-foreground/60">
            #{label}
          </li>
        ))}
      </ul>
    </section>
  )
}
