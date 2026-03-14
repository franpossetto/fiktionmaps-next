import { notFound } from "next/navigation"
import { getFictionById } from "@/lib/users-service"
import { FictionEditView } from "@/components/admin/fiction-edit-view"

interface AdminFictionEditPageProps {
  params: Promise<{ id: string }>
}

export default async function AdminFictionEditPage({ params }: AdminFictionEditPageProps) {
  const { id } = await params
  const fiction = await getFictionById(id)
  if (!fiction) notFound()

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-background text-foreground">
      <FictionEditView initialFiction={fiction} />
    </div>
  )
}
