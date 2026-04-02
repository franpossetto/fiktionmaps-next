import { getAllFictions } from "@/lib/server"
import { FictionLanding } from "@/components/fictions/fiction-landing"

export default async function FictionsPage() {
  const all = await getAllFictions()
  const fictions = all.filter((f) => f.active)
  return (
    <div className="h-full">
      <FictionLanding initialFictions={fictions} />
    </div>
  )
}
