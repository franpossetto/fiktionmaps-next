"use client"

import Image from "next/image"
import { useTranslations } from "next-intl"

/** Static mockup — no backend / unlock logic yet. */
const MOCK_ACHIEVEMENTS = [
  { id: "observer", src: "/levels/level-observer.png?v=2" },
  { id: "explorer", src: "/levels/level-explorer.png?v=2" },
  { id: "collector", src: "/levels/level-collector.png?v=2" },
  { id: "magician", src: "/levels/level-magician.png?v=2" },
  { id: "legend", src: "/levels/level-legend.png?v=2" },
] as const

export function ProfileAchievementsAside() {
  const t = useTranslations("Profile")

  return (
    <section className="space-y-2">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {t("achievementsHeading")}
      </h2>
      <ul className="grid grid-cols-3 gap-0">
        {MOCK_ACHIEVEMENTS.map((badge) => (
          <li key={badge.id} className="relative aspect-square w-full">
            <Image
              src={badge.src}
              alt=""
              fill
              sizes="100px"
              className="object-contain"
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
