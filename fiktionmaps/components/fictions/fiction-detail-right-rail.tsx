import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { MapPin } from "lucide-react"
import { FictionInterestTags } from "@/components/fictions/fiction-interest-tags"
import type { City } from "@/src/cities/domain/city.entity"
import { cn } from "@/lib/utils"

export async function FictionDetailRightRail({
  fictionInterestTags,
  initialCities,
  contributorsSlot,
}: {
  fictionInterestTags: { id: string; label: string }[]
  initialCities: City[]
  /** Deferred contributors (Suspense). */
  contributorsSlot?: ReactNode
}) {
  const t = await getTranslations("Fictions")
  const showInterests = fictionInterestTags.length > 0
  const showCities = initialCities.length > 0
  const hasRightRail = showInterests || showCities || Boolean(contributorsSlot)
  if (!hasRightRail) return null

  const citiesSectionBorderTop = showInterests

  return (
    <div className="w-full space-y-4">
      <FictionInterestTags tags={fictionInterestTags} />

      {showCities && (
        <section className={cn("space-y-2", citiesSectionBorderTop && "border-t border-border/60 pt-4")}>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">{t("citiesHeading")}</p>
          <ul className="space-y-2">
            {initialCities.map((city) => (
              <li key={city.id} className="text-sm">
                <Link
                  href={`/cities/${city.slug}`}
                  className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {city.name}
                  {city.country ? `, ${city.country}` : ""}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {contributorsSlot}
    </div>
  )
}
