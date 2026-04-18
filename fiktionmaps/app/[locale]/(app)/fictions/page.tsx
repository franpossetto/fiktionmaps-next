import { getAllFictionsCached } from "@/src/fictions/infrastructure/next/fiction.queries"
import { FictionLanding } from "@/components/fictions/fiction-landing"

export default async function FictionsPage() {
  const all = await getAllFictionsCached()
  const fictions = all.filter((f) => f.active)
  return (
    <div className="h-full">
      <FictionLanding initialFictions={fictions} />
    </div>
  )
}
