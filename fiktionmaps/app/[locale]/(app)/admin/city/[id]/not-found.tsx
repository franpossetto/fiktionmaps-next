import { Link } from "@/i18n/navigation"
import { ArrowLeft } from "lucide-react"

export default function AdminCityNotFound() {
  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <Link
        href="/admin"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Admin
      </Link>
      <p className="text-muted-foreground">City not found.</p>
    </div>
  )
}
