import { notFound, redirect } from "next/navigation"
import { getHuntByIdCached } from "@/src/hunts/infrastructure/next/hunt.queries"
import { getActiveFictionsCached } from "@/src/fictions/infrastructure/next/fiction.queries"
import { huntSourcesSupabaseAdapter } from "@/src/hunts/infrastructure/supabase/hunt-source.repository.impl"
import { createFictionsSupabaseAdapter } from "@/src/fictions/infrastructure/supabase/fiction.repository.impl"
import { createClient } from "@/lib/supabase/server"
import { HuntReviewPage } from "@/components/contribute/hunt/hunt-review-page"

type Props = {
  params: Promise<{ huntId: string }>
}

export default async function HuntReviewRoute({ params }: Props) {
  const { huntId } = await params

  const hunt = await getHuntByIdCached(huntId)
  if (!hunt) notFound()

  // Only allow owner or staff to access
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  if (hunt.createdBy !== user.id) {
    // Staff check is done at layout level; here just 404 for non-owners
    notFound()
  }

  const [source, fictions] = await Promise.all([
    huntSourcesSupabaseAdapter.getById(hunt.huntSourceId),
    getActiveFictionsCached(),
  ])
  if (!source) notFound()

  let fictionTitle = source.contextLabel ?? "Unknown"
  if (source.fictionId) {
    const fictionsRepo = createFictionsSupabaseAdapter(createClient)
    const fiction = await fictionsRepo.getById(source.fictionId)
    if (fiction) fictionTitle = fiction.title
  }

  return (
    <HuntReviewPage
      hunt={hunt}
      sourceId={source.id}
      fictionId={source.fictionId}
      fictionTitle={fictionTitle}
      contextLabel={source.contextLabel}
      sourceUrl={source.sourceUrl}
      fictions={fictions}
    />
  )
}
