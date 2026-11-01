import Image from "next/image"
import { getTranslations } from "next-intl/server"
import { cn } from "@/lib/utils"
import type { WishlistCitySummary } from "@/src/place-wishlists/domain/place-wishlist.entity"
import { FICTION_SLUG_DETAIL_SIDEBAR_RIGHT_GAP_PX, FICTION_SLUG_DETAIL_SIDEBAR_WIDTH_PX } from "@/components/fictions/fiction-slug-detail-shell"

export async function WishlistCitySidebarCard({ city }: { city: WishlistCitySummary }) {
  const t = await getTranslations("Profile")
  const title = city.cityName?.trim() || t("unknownCity")
  const photo = city.cityImage?.trim() || null

  return (
    <div className="hidden justify-end py-10 lg:flex" style={{ paddingRight: `${FICTION_SLUG_DETAIL_SIDEBAR_RIGHT_GAP_PX}px` }}>
      <div className="space-y-3.5" style={{ width: `${FICTION_SLUG_DETAIL_SIDEBAR_WIDTH_PX}px` }}>
        <div className="relative ml-auto aspect-[2/3] w-full overflow-hidden rounded-lg border border-border/60 bg-muted/30">
          {photo ? (
            <Image src={photo} alt={title} fill className="object-cover" sizes={`${FICTION_SLUG_DETAIL_SIDEBAR_WIDTH_PX}px`} />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-3 text-center text-xs text-muted-foreground/60">
              {t("wishlistCityNoPhoto")}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <h2 className="max-w-full break-words font-serif text-[1.35rem] font-semibold leading-tight text-foreground xl:text-[1.5rem]">
            {title}
          </h2>
          {city.cityCountry ? (
            <p className="text-sm text-muted-foreground">{city.cityCountry}</p>
          ) : null}
        </div>
        <div className={cn("border-t border-border/60 pt-3")}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground">
            {t("wishlistHeading")}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("wishlistCityPlaces", { count: city.count })}
          </p>
        </div>
      </div>
    </div>
  )
}
