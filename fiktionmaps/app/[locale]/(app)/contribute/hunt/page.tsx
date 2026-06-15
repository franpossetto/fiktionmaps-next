import dynamic from "next/dynamic"
import { getActiveFictionsCached } from "@/src/fictions/infrastructure/next/fiction.queries"
import { getMyHuntSourcesCached, getHuntsBySourceIdCached } from "@/src/hunts/infrastructure/next/hunt.queries"
import type { Hunt } from "@/src/hunts/domain/hunt.entity"

const HuntSourceWizard = dynamic(
  () => import("@/components/contribute/hunt/hunt-source-wizard").then((m) => m.HuntSourceWizard),
  {
    loading: () => (
      <div className="h-72 animate-pulse rounded-xl border border-border bg-card" />
    ),
  },
)

export default async function HuntPage() {
  const [fictions, sources] = await Promise.all([
    getActiveFictionsCached(),
    getMyHuntSourcesCached(),
  ])

  const huntsBySource: Record<string, Hunt[]> = {}
  if (sources.length > 0) {
    const huntArrays = await Promise.all(
      sources.map((s) => getHuntsBySourceIdCached(s.id)),
    )
    sources.forEach((s, i) => {
      huntsBySource[s.id] = huntArrays[i] ?? []
    })
  }

  return (
    <HuntSourceWizard
      fictions={fictions}
      sources={sources}
      huntsBySource={huntsBySource}
    />
  )
}
