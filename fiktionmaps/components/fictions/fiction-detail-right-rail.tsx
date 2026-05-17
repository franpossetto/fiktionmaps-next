import Image from "next/image"
import { MapPin } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { FictionInterestTags } from "@/components/fictions/fiction-interest-tags"
import type { City } from "@/src/cities/domain/city.entity"
import type { FictionContributorProfile } from "@/src/contributions/domain/contribution.entity"
import { cn } from "@/lib/utils"

export async function FictionDetailRightRail({
  fictionInterestTags,
  contributors,
  initialCities,
}: {
  fictionInterestTags: { id: string; label: string }[]
  contributors: FictionContributorProfile[]
  initialCities: City[]
}) {
  const t = await getTranslations("Fictions")
  const showInterests = fictionInterestTags.length > 0
  const showCities = initialCities.length > 0
  const showContributors = contributors.length > 0
  const hasRightRail = showInterests || showCities || showContributors
  if (!hasRightRail) return null

  function displayName(p: FictionContributorProfile): string {
    return p.username?.trim() || t("contributorNameFallback")
  }

  const citiesSectionBorderTop = showInterests
  const contributorsSectionBorderTop = showInterests || showCities

  return (
    <div className="mx-auto w-full max-w-[260px] space-y-4">
      <FictionInterestTags tags={fictionInterestTags} />

      {showCities && (
        <section className={cn("space-y-2", citiesSectionBorderTop && "border-t border-border/60 pt-4")}>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">{t("citiesHeading")}</p>
          <ul className="space-y-2">
            {initialCities.map((city) => (
              <li key={city.id} className="text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {city.name}
                  {city.country ? `, ${city.country}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showContributors && (
        <section
          className={cn("space-y-2", contributorsSectionBorderTop && "border-t border-border/60 pt-4")}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">{t("contributorsHeading")}</p>
          <ul className="space-y-2">
            {contributors.map((p) => {
              const label = displayName(p)
              const initial = label.charAt(0).toUpperCase()
              return (
                <li key={p.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-muted">
                    {p.avatarUrl?.trim() ? (
                      <Image src={p.avatarUrl.trim()} alt={label} width={28} height={28} className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted-foreground">
                        {initial}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 truncate text-foreground">{label}</span>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
