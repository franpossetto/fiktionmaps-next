import { Link } from "@/i18n/navigation"
import { ArrowLeft } from "lucide-react"

export default function FictionNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-muted-foreground">This fiction could not be found.</p>
      <Link
        href="/fictions"
        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Fictions
      </Link>
    </div>
  )
}
