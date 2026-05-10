import { FictionDetailRouteLoading } from "@/components/fictions/fiction-detail-route-loading"

export default function FictionSlugLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background text-foreground">
      <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <FictionDetailRouteLoading />
      </div>
    </div>
  )
}
