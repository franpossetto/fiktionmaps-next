import dynamic from "next/dynamic"
import { notFound } from "next/navigation"
import { getMyHuntsWorkQueueCached } from "@/src/hunts/infrastructure/next/hunt.queries"
import { isAIAvailable } from "@/lib/ai/get-llm-provider"

const HuntWorkQueue = dynamic(
  () => import("@/components/contribute/hunt/hunt-work-queue").then((m) => m.HuntWorkQueue),
  {
    loading: () => (
      <div className="h-72 animate-pulse rounded-xl border border-border bg-card" />
    ),
  },
)

export default async function HuntWorkPage() {
  if (!isAIAvailable()) notFound()

  const items = await getMyHuntsWorkQueueCached()

  return <HuntWorkQueue items={items} />
}
