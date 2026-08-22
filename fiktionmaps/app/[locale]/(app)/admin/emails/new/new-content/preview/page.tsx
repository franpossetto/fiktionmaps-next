import { redirect } from "next/navigation"
import EmailNewContentPreview from "@/components/admin/email-new-content-preview"
import { isUuidString } from "@/lib/validation/primitives"
import { previewNewContentEmailAction } from "@/src/emails/infrastructure/next/email.new-content.actions"
import { getCityByIdCached } from "@/src/cities/infrastructure/next/city.queries"

type PageProps = {
  searchParams: Promise<{ cityId?: string; places?: string }>
}

export default async function AdminEmailsNewContentPreviewPage({ searchParams }: PageProps) {
  const params = await searchParams
  const cityId = params.cityId?.trim() ?? ""
  const placeIds = (params.places ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => isUuidString(id))
    .slice(0, 20)

  if (!isUuidString(cityId) || placeIds.length === 0) {
    redirect("/admin/emails/new/new-content")
  }

  const city = await getCityByIdCached(cityId)
  if (!city) {
    redirect("/admin/emails/new/new-content")
  }

  const preview = await previewNewContentEmailAction({ cityId, placeIds })
  const initialSubject = preview.success
    ? preview.subject
    : `Nuevas locaciones en ${city.name}`
  const initialHtml = preview.success ? preview.html : ""

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <EmailNewContentPreview
        cityId={cityId}
        cityName={city.name}
        placeIds={placeIds}
        selectHref="/admin/emails/new/new-content"
        initialSubject={initialSubject}
        initialHtml={initialHtml}
      />
    </div>
  )
}
