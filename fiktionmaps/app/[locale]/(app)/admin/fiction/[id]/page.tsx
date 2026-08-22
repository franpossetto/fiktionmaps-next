import { notFound } from "next/navigation"
import { getFictionByIdCached } from "@/src/fictions/infrastructure/next/fiction.queries"
import { FictionEditView } from "@/components/admin/fiction-edit-view"

interface AdminFictionEditPageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function AdminFictionEditPage({ params }: AdminFictionEditPageProps) {
  const { id } = await params
  const fiction = await getFictionByIdCached(id)
  if (!fiction) notFound()

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl min-w-0 flex-col overflow-y-auto bg-background px-5 text-foreground">
      <FictionEditView initialFiction={fiction} />
    </div>
  )
}
