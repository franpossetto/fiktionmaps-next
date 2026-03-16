"use client"

import { useRouter } from "@/i18n/navigation"
import { FictionDetail } from "@/components/fictions/fiction-detail"
import type { FictionWithMedia } from "@/src/fictions/fiction.domain"

export function FictionDetailPageClient({ fiction }: { fiction: FictionWithMedia }) {
  const router = useRouter()
  return (
    <div className="h-full">
      <FictionDetail
        fiction={fiction}
        onBack={() => router.push("/fictions")}
      />
    </div>
  )
}
