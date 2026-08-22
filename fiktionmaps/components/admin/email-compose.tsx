"use client"

import { useCallback, useEffect, useRef, useState, useTransition } from "react"
import { Link, useRouter } from "@/i18n/navigation"
import { ArrowLeft, ArrowRight, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AppDetailRailsShell } from "@/components/layout/app-detail-rails-shell"
import type { EmailRecipient } from "@/src/emails/domain/email.entity"
import {
  previewEmailAction,
  searchEmailRecipientsAction,
  sendWelcomeEmailAction,
} from "@/src/emails/infrastructure/next/email.actions"
import { cn } from "@/lib/utils"

const FIELD_LABEL =
  "w-16 shrink-0 pt-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground"

type EmailComposeProps = {
  recentRecipients: EmailRecipient[]
}

export function EmailCompose({ recentRecipients }: EmailComposeProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<EmailRecipient[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [listOpen, setListOpen] = useState(false)
  const [recipient, setRecipient] = useState<EmailRecipient | null>(null)
  const [subject, setSubject] = useState("")
  const [dryRun, setDryRun] = useState(false)
  const [ignoreAlreadySent, setIgnoreAlreadySent] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [isPreviewing, startPreview] = useTransition()
  const [isSending, startSend] = useTransition()
  const searchRequestId = useRef(0)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const blurCloseTimer = useRef<number | null>(null)
  const busy = isPreviewing || isSending

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (trimmed.length < 1) {
      setResults([])
      setSearching(false)
      setSearchError(null)
      return
    }
    const requestId = ++searchRequestId.current
    setSearching(true)
    setSearchError(null)
    const result = await searchEmailRecipientsAction({ query: trimmed, filter: "all" })
    if (searchRequestId.current !== requestId) return
    if (!result.success) {
      setSearchError(result.error)
      setResults([])
    } else {
      setResults(result.recipients)
    }
    setSearching(false)
  }, [])

  useEffect(() => {
    if (recipient) return
    const handle = window.setTimeout(() => {
      void runSearch(query)
    }, 300)
    return () => window.clearTimeout(handle)
  }, [query, recipient, runSearch])

  useEffect(() => {
    return () => {
      if (blurCloseTimer.current != null) window.clearTimeout(blurCloseTimer.current)
    }
  }, [])

  const onGeneratePreview = () => {
    if (!recipient) return
    startPreview(async () => {
      setPreviewError(null)
      const result = await previewEmailAction({
        userId: recipient.id,
        subject: subject.trim() || undefined,
      })
      if (!result.success) {
        setPreviewHtml(null)
        setPreviewError(result.error)
        return
      }
      setPreviewHtml(result.html)
      setSubject(result.subject)
    })
  }

  const addRecipient = (item: EmailRecipient) => {
    setRecipient(item)
    setQuery("")
    setResults([])
    setListOpen(false)
    setSubject("")
    setPreviewHtml(null)
    setPreviewError(null)
  }

  const removeRecipient = () => {
    setRecipient(null)
    setSubject("")
    setPreviewHtml(null)
    setPreviewError(null)
    requestAnimationFrame(() => searchInputRef.current?.focus())
  }

  const onConfirmSend = () => {
    if (!recipient) return
    startSend(async () => {
      setSendError(null)
      const result = await sendWelcomeEmailAction({
        userId: recipient.id,
        subject: subject.trim() || undefined,
        dryRun,
        ignoreAlreadySent,
      })
      setConfirmOpen(false)
      if (!result.success) {
        setSendError(result.error)
        return
      }
      router.push("/admin/emails")
      router.refresh()
    })
  }

  const showSuggestions =
    listOpen && !recipient && query.trim().length > 0 && (searching || results.length > 0 || searchError)

  const canSend = Boolean(recipient) && !busy

  const rightAside = (
    <div className="flex h-full min-h-0 flex-col gap-8 py-2 @[1600px]/rails:py-0">
      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Opciones
        </h2>
        <div className="space-y-3">
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-foreground">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-foreground"
            />
            <span>
              Dry-run
              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                Persiste sin llamar a Resend
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2.5 text-sm text-foreground">
            <input
              type="checkbox"
              checked={ignoreAlreadySent}
              onChange={(e) => setIgnoreAlreadySent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-foreground"
            />
            <span>
              Ignore already sent
              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                Permite reenviar welcome
              </span>
            </span>
          </label>
        </div>
      </section>

      {recentRecipients.length > 0 && (
        <section className="min-h-0 space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Latest
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {recentRecipients.map((item) => {
              const selected = recipient?.id === item.id
              const label = item.fullName || item.username || item.email
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addRecipient(item)}
                  title={item.email}
                  className={cn(
                    "inline-flex max-w-full items-center truncate rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    selected
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-muted/40 text-foreground hover:bg-muted",
                  )}
                >
                  <span className="truncate">{label}</span>
                </button>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )

  return (
    <AppDetailRailsShell mainColumnScroll={false} rightAside={rightAside}>
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex h-[60px] shrink-0 items-center gap-3 border-b border-border px-5">
          <Link
            href="/admin/emails/new"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Volver a templates"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-foreground">Welcome</h1>
            <p className="truncate text-xs text-muted-foreground">New email</p>
          </div>
        </header>

        <div className="shrink-0 border-b border-border px-5">
          <div className="relative flex gap-4 border-b border-border/60 py-3">
            <span className={FIELD_LABEL}>Para</span>
            <div className="min-w-0 flex-1">
              <div className="flex min-h-10 items-center gap-2">
                {recipient ? (
                  <span className="inline-flex max-w-full items-center gap-2 rounded-md bg-muted px-2.5 py-1.5 text-sm text-foreground">
                    <span className="truncate font-medium">
                      {recipient.fullName || recipient.username || recipient.email}
                    </span>
                    <span className="truncate text-muted-foreground">{recipient.email}</span>
                    <button
                      type="button"
                      onClick={removeRecipient}
                      className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                      aria-label="Quitar destinatario"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ) : (
                  <>
                    <input
                      ref={searchInputRef}
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value)
                        setListOpen(true)
                      }}
                      onFocus={() => {
                        if (blurCloseTimer.current != null) {
                          window.clearTimeout(blurCloseTimer.current)
                          blurCloseTimer.current = null
                        }
                        if (query.trim().length > 0) setListOpen(true)
                      }}
                      onBlur={() => {
                        blurCloseTimer.current = window.setTimeout(() => setListOpen(false), 150)
                      }}
                      placeholder="Buscar por email, username o nombre"
                      className="h-10 w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
                    />
                    {searching && (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                    )}
                  </>
                )}
              </div>

              {showSuggestions && (
                <ul className="absolute left-20 right-5 top-[calc(100%-2px)] z-20 max-h-56 overflow-y-auto border border-border bg-background shadow-md">
                  {searchError && (
                    <li className="px-3 py-2.5 text-sm text-red-500">{searchError}</li>
                  )}
                  {!searching && !searchError && results.length === 0 && (
                    <li className="px-3 py-2.5 text-sm text-muted-foreground">Sin resultados</li>
                  )}
                  {results.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => addRecipient(item)}
                        className="flex w-full items-baseline justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted"
                      >
                        <span className="font-medium text-foreground">
                          {item.fullName || item.username || item.email}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">{item.email}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

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
                disabled={!recipient || busy}
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
              title="Preview email"
              srcDoc={previewHtml}
              className="absolute inset-0 h-full w-full border-0 bg-background"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-8">
              <p className="text-center text-base text-muted-foreground sm:text-lg">
                {previewError ?? "Generá el preview para ver el correo."}
              </p>
            </div>
          )}
        </div>

        <footer className="relative z-10 shrink-0 bg-background">
          <div className="h-px w-full bg-border/60" aria-hidden />
          {sendError ? (
            <p className="px-5 pt-2 text-center text-xs text-red-500">{sendError}</p>
          ) : null}
          <div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex min-w-0 justify-start">
              <Link
                href="/admin/emails/new"
                className="inline-flex min-h-9 max-w-full shrink-0 items-center gap-1.5 text-sm text-muted-foreground transition-opacity hover:opacity-70"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">Back</span>
              </Link>
            </div>
            <span className="block min-h-[1.25rem] w-px shrink-0" aria-hidden />
            <div className="flex min-w-0 justify-end">
              <Button
                type="button"
                variant={canSend ? "default" : "outline"}
                size="default"
                disabled={!canSend}
                onClick={() => setConfirmOpen(true)}
                className={cn(
                  "h-9 w-fit shrink-0 rounded-lg px-4 text-sm font-medium",
                  !canSend && "border border-border bg-background hover:bg-muted",
                )}
              >
                Enviar
                <ArrowRight className="ml-2 h-4 w-4 shrink-0" aria-hidden />
              </Button>
            </div>
          </div>
        </footer>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar envío</AlertDialogTitle>
            <AlertDialogDescription>
              {dryRun
                ? "Dry-run: se guardará el intento sin llamar a Resend."
                : "Se enviará el welcome real al destinatario seleccionado."}
              {ignoreAlreadySent
                ? " Ignore activo: se permite reenviar aunque ya exista un welcome sent."
                : null}
              {recipient ? (
                <>
                  <br />
                  Destinatario: {recipient.email}
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSending}>Cancelar</AlertDialogCancel>
            <Button type="button" disabled={isSending} onClick={onConfirmSend}>
              {isSending ? "Enviando…" : "Confirmar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppDetailRailsShell>
  )
}
