"use client"

import { useCallback, useState, useTransition } from "react"
import { Loader2, Mail, Plus, RotateCcw, Trash2 } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { AppDetailRailsShell } from "@/components/layout/app-detail-rails-shell"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { EmailSendWithBatch } from "@/src/emails/domain/email.entity"
import {
  deleteEmailSendAction,
  retryEmailSendAction,
} from "@/src/emails/infrastructure/next/email.actions"
import { listRecentEmailSendsQuery } from "@/src/emails/infrastructure/next/email.queries"
import { cn } from "@/lib/utils"

function canRetrySend(status: EmailSendWithBatch["status"]) {
  return status === "queued" || status === "failed"
}

function canDeleteSend(status: EmailSendWithBatch["status"]) {
  return status === "queued" || status === "failed" || status === "skipped"
}

type EmailsListProps = {
  initialSends: EmailSendWithBatch[]
}

export function EmailsList({ initialSends }: EmailsListProps) {
  const [sends, setSends] = useState(initialSends)
  const [sendToDelete, setSendToDelete] = useState<EmailSendWithBatch | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionResult, setActionResult] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const refreshSends = useCallback(() => {
    startTransition(async () => {
      const result = await listRecentEmailSendsQuery(20)
      if (result.success) setSends(result.sends)
    })
  }, [])

  const onRetrySend = (send: EmailSendWithBatch) => {
    startTransition(async () => {
      setActionError(null)
      setActionResult(null)
      const result = await retryEmailSendAction({ sendId: send.id })
      if (!result.success) {
        setActionError(result.error)
        return
      }
      const detail = result.error ? ` (${result.error})` : ""
      setActionResult(`Reenvío: ${result.status}${detail}`)
      refreshSends()
    })
  }

  const onConfirmDelete = () => {
    if (!sendToDelete) return
    startTransition(async () => {
      setActionError(null)
      setActionResult(null)
      const result = await deleteEmailSendAction({ sendId: sendToDelete.id })
      setSendToDelete(null)
      if (!result.success) {
        setActionError(result.error)
        return
      }
      setActionResult("Envío eliminado")
      refreshSends()
    })
  }

  return (
    <AppDetailRailsShell>
      <div className="flex flex-col gap-6 px-5 pb-10 pt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/admin" className="hover:text-foreground">
              Admin
            </Link>
            <span>/</span>
            <span>Emails</span>
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Mail className="h-6 w-6" />
            Emails
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Historial de envíos manuales. Creá uno nuevo y elegí un template.
          </p>
        </div>
        <Button asChild variant="cta" className="gap-2 shrink-0">
          <Link href="/admin/emails/new">
            <Plus className="h-4 w-4" />
            New email
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {sends.length === 0 ? "Sin envíos" : `Últimos ${sends.length} envíos`}
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={refreshSends} disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Actualizar"}
        </Button>
      </div>

      {actionError && <p className="text-sm text-red-500">{actionError}</p>}
      {actionResult && <p className="text-sm text-green-600">{actionResult}</p>}

      <div className="overflow-hidden rounded-xl border border-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Destinatario</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Asunto</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sends.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    Todavía no hay envíos.{" "}
                    <Link href="/admin/emails/new" className="underline hover:text-foreground">
                      Crear el primero
                    </Link>
                  </td>
                </tr>
              )}
              {sends.map((send) => (
                <tr key={send.id} className="border-b border-border/70 last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{send.nameTo}</div>
                    <div className="text-xs text-muted-foreground">{send.emailTo}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{send.emailType}</td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-muted-foreground">
                    {send.subject}
                    {send.dryRun ? " · dry-run" : ""}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-xs uppercase tracking-wide",
                        send.status === "sent" && "bg-green-500/15 text-green-700",
                        send.status === "failed" && "bg-red-500/15 text-red-700",
                        send.status === "skipped" && "bg-amber-500/15 text-amber-700",
                        send.status === "queued" && "bg-muted text-muted-foreground",
                      )}
                    >
                      {send.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                    {new Date(send.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {canRetrySend(send.status) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          disabled={isPending}
                          onClick={() => onRetrySend(send)}
                          title="Reenviar"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Resend
                        </Button>
                      )}
                      {canDeleteSend(send.status) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-red-600 hover:text-red-700"
                          disabled={isPending}
                          onClick={() => setSendToDelete(send)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Eliminar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AlertDialog
        open={sendToDelete != null}
        onOpenChange={(open) => {
          if (!open) setSendToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar envío</AlertDialogTitle>
            <AlertDialogDescription>
              Se borra el batch y el registro del historial. No se puede deshacer.
              {sendToDelete ? (
                <>
                  <br />
                  {sendToDelete.emailTo} · {sendToDelete.status}
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={onConfirmDelete}
            >
              {isPending ? "Eliminando…" : "Eliminar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </AppDetailRailsShell>
  )
}
