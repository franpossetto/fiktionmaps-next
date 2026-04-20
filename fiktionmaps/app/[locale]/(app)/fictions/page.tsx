import { getAllFictionsCached } from "@/src/fictions/infrastructure/next/fiction.queries"
import { getSceneCountsByFictionIdsCached } from "@/src/scenes/infrastructure/next/scene.queries"
import { getFictionLikeCountsCached } from "@/src/fiction-likes/infrastructure/next/fiction-likes.queries"
import { FictionLanding } from "@/components/fictions/fiction-landing"

export default async function FictionsPage() {
  const all = await getAllFictionsCached()
  const fictions = all.filter((f) => f.active)
  const allIds = fictions.map((f) => f.id)

  const [sceneCounts, likeCounts] = await Promise.all([
    getSceneCountsByFictionIdsCached(allIds),
    getFictionLikeCountsCached(allIds),
  ])

  return (
    <div className="h-full">
      <FictionLanding
        initialFictions={fictions}
        initialSceneCounts={sceneCounts}
        initialLikeCounts={likeCounts}
      />
    </div>
  )
}
