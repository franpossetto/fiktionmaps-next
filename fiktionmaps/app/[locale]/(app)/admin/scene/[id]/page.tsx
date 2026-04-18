import { notFound } from "next/navigation"
import { getAllFictionsCached } from "@/src/fictions/infrastructure/next/fiction.queries"
import { getAllPlacesCached } from "@/src/places/infrastructure/next/place.queries"
import { getSceneByIdUncached } from "@/src/scenes/infrastructure/next/scene.queries"
import { SceneEditView } from "@/components/admin/scene-edit-view"

interface AdminSceneEditPageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function AdminSceneEditPage({ params }: AdminSceneEditPageProps) {
  const { id } = await params
  const [scene, fictions, places] = await Promise.all([
    getSceneByIdUncached(id),
    getAllFictionsCached(),
    getAllPlacesCached(),
  ])
  if (!scene) notFound()

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <SceneEditView initialScene={scene} fictions={fictions} places={places} />
    </div>
  )
}
