import { notFound } from "next/navigation"
import { FictionImprovePhotoView } from "@/components/admin/fiction-improve-photo-view"
import { getFictionImprovePhotoInventories } from "@/src/asset-images/infrastructure/next/asset-image.queries"
import { getFictionByIdCached } from "@/src/fictions/infrastructure/next/fiction.queries"

interface AdminFictionImprovePhotoPageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function AdminFictionImprovePhotoPage({
  params,
}: AdminFictionImprovePhotoPageProps) {
  const { id } = await params
  const fiction = await getFictionByIdCached(id)
  if (!fiction) notFound()

  const inventories = await getFictionImprovePhotoInventories(fiction.id)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-background text-foreground">
      <FictionImprovePhotoView fiction={fiction} inventories={inventories} />
    </div>
  )
}
