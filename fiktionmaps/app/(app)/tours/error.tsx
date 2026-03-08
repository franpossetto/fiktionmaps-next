"use client"

import { useEffect } from "react"
import Link from "next/link"

interface ToursErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ToursError({ error, reset }: ToursErrorProps) {
  useEffect(() => {
    console.error("Tours error:", error)
  }, [error])

  return (
    <div className="flex h-full w-full items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 text-center">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          There was an error loading tours.
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-9 items-center justify-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-secondary"
          >
            Try again
          </button>
          <Link
            href="/tours"
            className="inline-flex h-9 items-center justify-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-secondary"
          >
            Back to tours
          </Link>
        </div>
      </div>
    </div>
  )
}
