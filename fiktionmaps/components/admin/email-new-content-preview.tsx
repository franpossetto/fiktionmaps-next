"use client"

import { useState, useTransition } from "react"
import { ArrowLeft } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { AppDetailRailsShell } from "@/components/layout/app-detail-rails-shell"
import { previewNewContentEmailAction } from "@/src/emails/infrastructure/next/email.new-content.actions"

const FIELD_LABEL =
  "w-16 shrink-0 pt-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground"

type EmailNewContentPreviewProps = {
  cityId: string
  cityName: string
  placeIds: string[]
  selectHref: string
  initialSubject: string
  initialHtml: string
}

export default function EmailNewContentPreview({
  cityId,
  cityName,
  placeIds,
  selectHref,
  initialSubject,
  initialHtml,
}: EmailNewContentPreviewProps) {
  const [subject, setSubject] = useState(initialSubject)
  const [previewHtml, setPreviewHtml] = useState(initialHtml)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [isPreviewing, startPreview] = useTransition()

  const onGeneratePreview = () => {
    startPreview(async () => {
      setPreviewError(null)
      const result = await previewNewContentEmailAction({
        cityId,
        placeIds,
        subject: subject.trim() || undefined,
      })
      if (!result.success) {
        setPreviewError(result.error)
        return
      }
      setPreviewHtml(result.html)
      setSubject(result.subject)
    })
  }

  return (
    <AppDetailRailsShell mainColumnScroll={false}>
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex h-[60px] shrink-0 items-center gap-3 border-b border-border px-5">
          <Link
            href={selectHref}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Volver a selección"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-foreground">New content</h1>
            <p className="truncate text-xs text-muted-foreground">
              {cityName} · {placeIds.length} lugar{placeIds.length === 1 ? "" : "es"}
            </p>
          </div>
        </header>

        <div className="shrink-0 border-b border-border px-5">
          <div className="flex gap-4 py-3">
            <span className={FIELD_LABEL}>Asunto</span>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value.slice(0, 200))}
                placeholder="Asunto del email"
                className="h-10 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={isPreviewing}
                onClick={onGeneratePreview}
              >
                {isPreviewing ? "Generando…" : "Generar preview"}
              </Button>
            </div>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 bg-muted/20">
          {previewHtml ? (
            <iframe
              title="Preview new content email"
              srcDoc={previewHtml}
              className="absolute inset-0 h-full w-full border-0 bg-background"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-8">
              <p className="text-center text-base text-muted-foreground sm:text-lg">
                {previewError ?? "Sin preview"}
              </p>
            </div>
          )}
        </div>

        <footer className="relative z-10 shrink-0 bg-background">
          <div className="h-px w-full bg-border/60" aria-hidden />
          <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Link
              href={selectHref}
              className="inline-flex min-h-9 items-center gap-1.5 text-sm text-muted-foreground transition-opacity hover:opacity-70"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
              Cambiar lugares
            </Link>
            <p className="text-xs text-muted-foreground">
              Preview · el envío todavía no está disponible
            </p>
          </div>
        </footer>
      </div>
    </AppDetailRailsShell>
  )
}
