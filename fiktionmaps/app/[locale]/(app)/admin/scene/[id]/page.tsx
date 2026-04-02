import { notFound } from "next/navigation"
import { getSceneById } from "@/lib/server"
import { SceneEditView } from "@/components/admin/scene-edit-view"

interface AdminSceneEditPageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function AdminSceneEditPage({ params }: AdminSceneEditPageProps) {
  const { id } = await params
  const scene = await getSceneById(id)
  if (!scene) notFound()

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background text-foreground">
      <SceneEditView initialScene={scene} />
    </div>
  )
}
