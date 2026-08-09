import { notFound } from "next/navigation"
import { PlaceImprovePhotoView } from "@/components/admin/place-improve-photo-view"
import { getPlaceImprovePhotoInventory } from "@/src/asset-images/infrastructure/next/asset-image.queries"
import { getPlaceLocationByIdForStaffSession } from "@/src/places/infrastructure/next/place.queries"

interface AdminPlaceImprovePhotoPageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function AdminPlaceImprovePhotoPage({
  params,
}: AdminPlaceImprovePhotoPageProps) {
  const { id } = await params
  const place = await getPlaceLocationByIdForStaffSession(id)
  if (!place) notFound()

  const inventory = await getPlaceImprovePhotoInventory(place.id)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-background text-foreground">
      <PlaceImprovePhotoView place={place} inventory={inventory} />
    </div>
  )
}
