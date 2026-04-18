"use client"

import { Link } from "@/i18n/navigation"
import { useEffect } from "react"

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("Global error:", error)
  }, [error])

  return (
    <html lang="en">
      <body className="m-0">
        <div className="flex h-screen w-screen items-center justify-center bg-background px-4 text-foreground">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 text-center">
            <h2 className="text-lg font-semibold">Unexpected application error</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We could not render this screen.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-9 items-center justify-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-secondary"
              >
                Try again
              </button>
              <Link
                href="/"
                className="inline-flex h-9 items-center justify-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-secondary"
              >
                Home
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
