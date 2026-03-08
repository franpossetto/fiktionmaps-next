import { FictionEditView } from "@/components/admin/fiction-edit-view"

interface AdminFictionEditPageProps {
  params: Promise<{ id: string }>
}

export default async function AdminFictionEditPage({ params }: AdminFictionEditPageProps) {
  const { id } = await params
  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="p-6 max-w-6xl mx-auto w-full pb-8">
        <FictionEditView fictionId={id} />
      </div>
    </div>
  )
}
