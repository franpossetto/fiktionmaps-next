import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 text-center">
        <h2 className="text-lg font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you requested does not exist.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex h-9 items-center justify-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-secondary"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
