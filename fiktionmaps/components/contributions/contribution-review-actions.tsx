"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "@/hooks/use-toast"
import { approveContributionAction, rejectContributionAction } from "@/src/contributions/infrastructure/next/contribution.actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export interface ContributionReviewActionsProps {
  contributionId: string
  /** Called after a successful approve or reject (before router.refresh). */
  onResolved?: () => void
  className?: string
}

export function ContributionReviewActions({
  contributionId,
  onResolved,
  className,
}: ContributionReviewActionsProps) {
  const t = useTranslations("Contributions")
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectNote, setRejectNote] = useState("")

  async function approve() {
    setBusy(true)
    try {
      const res = await approveContributionAction({ id: contributionId })
      if (!res.success) {
        toast({
          title: t("staffReview_toastErrorTitle"),
          description: res.error ?? t("staffReview_toastGeneric"),
          variant: "destructive",
        })
        return
      }
      toast({ title: t("staffReview_approvedToast") })
      onResolved?.()
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function submitReject() {
    setBusy(true)
    try {
      const raw = rejectNote.trim()
      const res = await rejectContributionAction({
        id: contributionId,
        ...(raw ? { moderatorNote: raw } : {}),
      })
      if (!res.success) {
        toast({
          title: t("staffReview_toastErrorTitle"),
          description: res.error ?? t("staffReview_toastGeneric"),
          variant: "destructive",
        })
        return
      }
      toast({ title: t("staffReview_rejectedToast") })
      setRejecting(false)
      onResolved?.()
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  if (!rejecting) {
    return (
      <div className={cn("flex flex-wrap gap-2", className)}>
        <Button type="button" size="sm" disabled={busy} onClick={approve}>
          {busy ? t("staffReview_busy") : t("staffReview_approve")}
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setRejecting(true)}>
          {t("staffReview_reject")}
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("flex max-w-md flex-col gap-2", className)}>
      <label className="text-xs font-medium text-foreground">{t("staffReview_rejectNoteLabel")}</label>
      <Textarea
        placeholder={t("staffReview_rejectNotePlaceholder")}
        value={rejectNote}
        disabled={busy}
        onChange={(e) => setRejectNote(e.target.value)}
        rows={3}
        className="resize-y text-sm"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setRejecting(false)}>
          {t("staffReview_cancelReject")}
        </Button>
        <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={submitReject}>
          {busy ? t("staffReview_busy") : t("staffReview_confirmReject")}
        </Button>
      </div>
    </div>
  )
}
