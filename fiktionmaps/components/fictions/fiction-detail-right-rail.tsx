import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { MapPin } from "lucide-react"
import { TopContributorsSection } from "@/components/contributions/top-contributors-section"
import { FictionInterestTags } from "@/components/fictions/fiction-interest-tags"
import type { City } from "@/src/cities/domain/city.entity"
import type { FictionContributorRankedProfile } from "@/src/contributions/domain/contribution.entity"
import { cn } from "@/lib/utils"

export async function FictionDetailRightRail({
  fictionId,
  fictionTitle,
  fictionInterestTags,
  contributors,
  initialCities,
}: {
  fictionId: string
  fictionTitle: string
  fictionInterestTags: { id: string; label: string }[]
  contributors: FictionContributorRankedProfile[]
  initialCities: City[]
}) {
  const t = await getTranslations("Fictions")
  const showInterests = fictionInterestTags.length > 0
  const showCities = initialCities.length > 0
  const showContributors = contributors.length > 0
  const hasRightRail = showInterests || showCities || showContributors
  if (!hasRightRail) return null

  const citiesSectionBorderTop = showInterests
  const contributorsSectionBorderTop = showInterests || showCities

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

      {showContributors && (
        <TopContributorsSection
          contributors={contributors}
          title={t("contributorsHeading")}
          nameFallback={t("contributorNameFallback")}
          showBorderTop={contributorsSectionBorderTop}
          modalContext={{ type: "fiction", fictionId, fictionTitle }}
        />
      )}
    </div>
  )
}
