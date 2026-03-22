import { Link } from "@/i18n/navigation"
import { ArrowLeft } from "lucide-react"

export default function AdminSceneNotFound() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Admin
      </Link>
      <p className="text-muted-foreground">Scene not found.</p>
    </div>
  )
}
