import { Link } from "@/i18n/navigation"

export default function CityNotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-background text-foreground">
      <p className="text-lg font-semibold">City not found</p>
      <Link href="/" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
        Go home
      </Link>
    </div>
  )
}
