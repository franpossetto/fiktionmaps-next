import { MapPin } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { FictionInterestTags } from "@/components/fictions/fiction-interest-tags"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { City } from "@/src/cities/domain/city.entity"

export async function FictionDetailRightRail({
  fictionInterestTags,
  initialCities,
  sameCityRecommendations,
}: {
  fictionInterestTags: { id: string; label: string }[]
  initialCities: City[]
  sameCityRecommendations: FictionWithMedia[]
}) {
  const t = await getTranslations("Fictions")
  const hasRightRail = fictionInterestTags.length > 0 || initialCities.length > 0
  if (!hasRightRail) return null

  const recommendedPreview = sameCityRecommendations.slice(0, 3)
  const citiesLabel =
    initialCities.length === 1
      ? (initialCities[0]?.name ?? t("thisCity"))
      : t("citiesCount", { count: initialCities.length })

  function getCreditLabel(type: FictionWithMedia["type"]): string {
    if (type === "movie") return t("creditDirector")
    if (type === "tv-series") return t("creditCreator")
    return t("creditAuthor")
  }

  return (
    <div className="mx-auto w-full max-w-[260px] space-y-4">
      <FictionInterestTags tags={fictionInterestTags} />

      {initialCities.length > 0 && (
        <section className={fictionInterestTags.length > 0 ? "space-y-2 border-t border-border/60 pt-4" : "space-y-2"}>
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

      {recommendedPreview.length > 0 && initialCities.length > 0 && (
        <section className="space-y-2 border-t border-border/60 pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
            {t("recommendedInCities", { cities: citiesLabel })}
          </h3>
          <ul className="space-y-2">
            {recommendedPreview.map((rec) => (
              <li key={rec.id}>
                <Link
                  href={`/fictions/${rec.slug ?? rec.id}`}
                  className="block rounded-md px-1 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                >
                  <p className="line-clamp-2 break-words text-sm font-medium leading-snug text-foreground">{rec.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {rec.author?.trim()
                      ? `${getCreditLabel(rec.type)}: ${rec.author.trim()}`
                      : rec.type === "movie"
                        ? t("typeMovie")
                        : rec.type === "tv-series"
                          ? t("typeTvSeriesShort")
                          : t("typeBook")}
                    {rec.year ? ` · ${rec.year}` : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          {sameCityRecommendations.length > 3 && (
            <Link href="/fictions" className="inline-block text-xs font-medium text-primary hover:underline">
              {t("viewMore")}
            </Link>
          )}
        </section>
      )}
    </div>
  )
}
