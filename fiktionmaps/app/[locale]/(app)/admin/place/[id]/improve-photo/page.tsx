import { notFound } from "next/navigation"
import { PlaceImprovePhotoView } from "@/components/admin/place-improve-photo-view"
import { getPlaceLocationByIdDetailCached } from "@/src/places/infrastructure/next/place.queries"

interface AdminPlaceImprovePhotoPageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function AdminPlaceImprovePhotoPage({
  params,
}: AdminPlaceImprovePhotoPageProps) {
  const { id } = await params
  const place = await getPlaceLocationByIdDetailCached(id)
  if (!place) notFound()

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-background text-foreground">
      <PlaceImprovePhotoView place={place} />
    </div>
  )
}
