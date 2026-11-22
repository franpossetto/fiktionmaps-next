import { getFormatter, getTranslations } from "next-intl/server"
import { buildFictionStoryCards, type FictionStoryCard } from "@/components/fictions/story/build-fiction-story-cards"
import type { City } from "@/src/cities/domain/city.entity"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import type { Place } from "@/src/places/domain/place.entity"
import type { Scene } from "@/src/scenes/domain/scene.entity"

/** Server helper: localized copy + card deck for any fiction. */
export async function composeFictionStoryCards({
  fiction,
  places,
  cities,
  scenes,
}: {
  fiction: FictionWithMedia
  places: Place[]
  cities: City[]
  scenes: Scene[]
}): Promise<FictionStoryCard[]> {
  const [t, tFic, format] = await Promise.all([
    getTranslations("FictionStory"),
    getTranslations("Fictions"),
    getFormatter(),
  ])

  const typeLabel =
    fiction.type === "tv-series" ? tFic("typeTvSeries") : fiction.type === "book" ? tFic("typeBook") : tFic("typeMovie")

  const cityNames = cities.map((c) => c.name)
  const cityLabel =
    cityNames.length === 0 ? "" : cityNames.length === 1 ? cityNames[0] : format.list(cityNames, { type: "conjunction" })

  const hookKey = (() => {
    if (fiction.type === "book") return cityLabel ? "hookSetInCity" : "hookSet"
    return cityLabel ? "hookFilmedInCity" : "hookFilmed"
  })()

  return buildFictionStoryCards({
    fiction,
    places,
    cities,
    scenes,
    copy: {
      typeLabel,
      coverSubtitle: cityLabel || undefined,
      hook: t(hookKey, { title: fiction.title, city: cityLabel }),
      quoteKicker: t("quoteKicker"),
      closeTitle: t("closeTitle", { title: fiction.title }),
      closeTitleCity: (city) => t("closeTitleCity", { city }),
      closeSubtitle: (count) => t("closeSubtitle", { count }),
      closeSubtitleMore: (shown, total) => t("closeSubtitleMore", { shown, total }),
      nextCity: (city) => t("nextCity", { city }),
      nextCityGeneric: t("nextCityGeneric"),
    },
  })
}
