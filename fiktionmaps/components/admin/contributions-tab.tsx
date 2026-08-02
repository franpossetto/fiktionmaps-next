"use client"

import { useCallback, useEffect, useState } from "react"
import { FileText, Loader2, Trash2 } from "lucide-react"
import { Link } from "@/i18n/navigation"
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
import {
  deleteContributionAction,
  listAdminContributionsAction,
} from "@/src/contributions/infrastructure/next/contribution.actions"
import type { AdminContributionListItem } from "@/src/contributions/domain/contribution.repository"
import { cn } from "@/lib/utils"

type StatusTab = "pending" | "rejected" | "approved"

const PAGE_SIZE = 50

const STATUS_TABS: { id: StatusTab; label: string; hint: string }[] = [
  { id: "pending", label: "Pending", hint: "Awaiting review — deletable" },
  { id: "rejected", label: "Rejected", hint: "Already rejected — deletable" },
  { id: "approved", label: "Approved", hint: "View only for now" },
]

function typeLabel(type: AdminContributionListItem["type"]): string {
  return type.replace(/_/g, " ")
}

export function ContributionsTab() {
  const [statusTab, setStatusTab] = useState<StatusTab>("pending")
  const [items, setItems] = useState<AdminContributionListItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<AdminContributionListItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadPage = useCallback(async (tab: StatusTab, offset: number, append: boolean) => {
    if (append) setLoadingMore(true)
    else {
      setLoading(true)
      setError(null)
    }

    const result = await listAdminContributionsAction(tab, offset)
    if (!result.success) {
      setError(result.error)
      if (!append) {
        setItems([])
        setTotalCount(0)
      }
    } else {
      setItems((prev) => (append ? [...prev, ...result.page.items] : result.page.items))
      setTotalCount(result.page.totalCount)
    }

    setLoading(false)
    setLoadingMore(false)
  }, [])

  useEffect(() => {
    void loadPage(statusTab, 0, false)
  }, [statusTab, loadPage])

  const canDelete = statusTab === "pending" || statusTab === "rejected"
  const hasMore = items.length < totalCount

  const handleConfirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    const result = await deleteContributionAction(toDelete.id)
    setDeleting(false)
    if (result.success) {
      setItems((prev) => prev.filter((item) => item.id !== toDelete.id))
      setTotalCount((prev) => Math.max(0, prev - 1))
      setToDelete(null)
    } else {
      setError(result.error)
      setToDelete(null)
    }
  }

  return (
    <div className="space-y-6 px-1">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Contributions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Clean up pending and rejected contribution rows. Approved rows are visible but not deletable yet.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          {totalCount.toLocaleString()} {statusTab}
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Contribution status">
        {STATUS_TABS.map((tab) => {
          const active = statusTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setStatusTab(tab.id)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left transition-colors",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="block text-sm font-medium">{tab.label}</span>
              <span className={cn("block text-xs", active ? "text-background/80" : "text-muted-foreground")}>
                {tab.hint}
              </span>
            </button>
          )
        })}
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-500">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading contributions…
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-16 text-center">
          <FileText className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No {statusTab} contributions.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Contributor</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const contributor =
                  item.contributorUsername || item.contributorFullName || "Unknown"
                return (
                  <tr key={item.id} className="border-b border-border/70 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{typeLabel(item.type)}</div>
                      <div className="text-xs text-muted-foreground">{item.entityType}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-foreground">{item.entityLabel || item.entityId.slice(0, 8)}</div>
                      <Link
                        href={`/contributions/${item.id}`}
                        className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                      >
                        Open review
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {item.contributorUsername ? `@${item.contributorUsername}` : contributor}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canDelete ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:bg-red-500/10 hover:text-red-500"
                          onClick={() => setToDelete(item)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Locked</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {hasMore ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            disabled={loadingMore}
            onClick={() => void loadPage(statusTab, items.length, true)}
          >
            {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Load more ({PAGE_SIZE})
          </Button>
        </div>
      ) : null}

      <AlertDialog open={toDelete != null} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete contribution?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the {toDelete?.status} contribution
              {toDelete?.entityLabel ? ` for “${toDelete.entityLabel}”` : ""}. Pending staged assets are
              cleaned up when present. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void handleConfirmDelete()}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
