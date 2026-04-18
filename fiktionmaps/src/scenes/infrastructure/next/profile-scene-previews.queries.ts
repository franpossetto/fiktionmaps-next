import { createClient } from "@/lib/supabase/server"
import { scenesSupabaseAdapter } from "@/src/scenes/infrastructure/supabase/scene.repository.impl"
import { getScenesCreatedByUserUseCase } from "@/src/scenes/application/get-scenes-created-by-user.usecase"
import type { ProfileScenePreview } from "@/src/scenes/domain/scene.entity"

export async function loadProfileScenesPreviewForCurrentUser(): Promise<ProfileScenePreview[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.id) return []
  return getScenesCreatedByUserUseCase(user.id, scenesSupabaseAdapter)
}
