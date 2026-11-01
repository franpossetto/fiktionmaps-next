import { Compass } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { AppDetailRailsShell } from "@/components/layout/app-detail-rails-shell"
import { PageBreadcrumb } from "@/components/navigation/page-breadcrumb"
import { Button } from "@/components/ui/button"
import { WishlistCitySidebarCard } from "@/components/profile/wishlist-city-sidebar-card"
import {
  WishlistCityMapSection,
  WishlistCityPlacesList,
} from "@/components/profile/wishlist-city-explorer"
import { WishlistCitySelectionProvider } from "@/components/profile/wishlist-city-selection"
import { publicUserProfilePath } from "@/lib/users/public-profile-path"
import { publicFictionPlacePath } from "@/lib/fictions/public-fiction-paths"
import type { WishlistCityCollection } from "@/src/place-wishlists/domain/place-wishlist.entity"

export async function WishlistCityCollectionView({
  username,
  collection,
}: {
  username: string
  collection: WishlistCityCollection
}) {
  const t = await getTranslations("Profile")
  const tMeta = await getTranslations("Metadata")
  const cityName = collection.selected.cityName?.trim() || t("unknownCity")
  const exploreMapHref = collection.selected.citySlug
    ? `/map?city=${encodeURIComponent(collection.selected.citySlug)}`
    : "/map"
  const items = collection.items.map((item) => ({
    placeId: item.placeId,
    placeName: item.placeName,
    placeImage: item.placeImage,
    fictionTitle: item.fictionTitle,
    address: item.address,
    lat: item.lat,
    lng: item.lng,
    href:
      item.fictionSlug && item.placeSlug
        ? publicFictionPlacePath(item.fictionSlug, item.placeSlug)
        : "/fictions",
  }))

  return (
    <WishlistCitySelectionProvider cityKey={collection.selected.key} items={items}>
      <AppDetailRailsShell
        leftAside={<WishlistCitySidebarCard city={collection.selected} />}
        rightAside={<WishlistCityPlacesList />}
      >
        <main className="px-6 py-8 sm:px-8 lg:px-10">
          <div className="mx-auto w-full max-w-[920px]">
            <div className="mb-6">
              <PageBreadcrumb
                ariaLabel={tMeta("breadcrumbNavAriaLabel")}
                items={[
                  { label: t("wishlistBreadcrumbProfile"), href: publicUserProfilePath(username) },
                  { label: t("wishlistHeading") },
                  { label: cityName },
                ]}
              />
            </div>

            <article className="space-y-6">
              <header className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="min-w-0 flex-1 text-balance text-3xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-4xl xl:text-[2.65rem]">
                  {t("wishlistCityPageTitle", { city: cityName })}
                </h1>
                <Button asChild size="sm" variant="cta" className="shrink-0">
                  <Link href={exploreMapHref}>
                    <Compass className="h-4 w-4" />
                    <span>{t("wishlistExploreCity", { city: cityName })}</span>
                  </Link>
                </Button>
              </header>

              <WishlistCityMapSection
                mapInstanceId={`wishlist-city-${collection.selected.key}`}
              />
            </article>
          </div>
        </main>
      </AppDetailRailsShell>
    </WishlistCitySelectionProvider>
  )
}
