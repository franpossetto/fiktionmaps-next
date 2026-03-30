import { redirect } from "next/navigation"

export default async function FictionSceneLegacyPage({
  params,
}: {
  params: Promise<{ fictionId: string; sceneId: string }>
}) {
  const { fictionId, sceneId } = await params
  redirect(`/fiction/${encodeURIComponent(fictionId)}/scene/${encodeURIComponent(sceneId)}`)
}
