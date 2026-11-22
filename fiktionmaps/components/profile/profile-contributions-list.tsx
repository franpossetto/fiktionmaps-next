"use client"

import { useEffect, useMemo, useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  ArrowRight,
  Ban,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Film,
  ImageIcon,
  Link2,
  MapPin,
  MessageSquare,
  Pencil,
  Sparkles,
  Users,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import {
  PROFILE_CONTRIBUTIONS_PAGE_SIZE,
  resolveContributionFpp,
} from "@/src/contributions/domain/contribution.config"
import type {
  ContributionType,
  ProfileContributionItem,
} from "@/src/contributions/domain/contribution.entity"
import { listProfileContributionsPageAction } from "@/src/contributions/infrastructure/next/contribution.actions"
import { contributionTypeMessageKey } from "@/components/contributions/contribution-type-label"
import { buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

function typeIcon(type: ContributionType): LucideIcon {
  switch (type) {
    case "create_fiction":
      return Film
    case "create_place":
      return MapPin
    case "add_scene":
      return Clapperboard
    case "add_photo":
      return ImageIcon
    case "add_place_to_scene":
      return Link2
    case "add_credits":
      return Users
    case "link_place_relationship":
      return Link2
    case "enrich_entity":
      return Sparkles
    case "correct_data":
      return Pencil
    case "mark_inaccessible":
      return Ban
    case "add_tip":
      return MessageSquare
    case "checkin":
      return MapPin
    default:
      return Sparkles
  }
}

function ContributionRow({
  item,
  selected,
  onSelect,
}: {
  item: ProfileContributionItem
  selected: boolean
  onSelect?: (item: ProfileContributionItem) => void
}) {
  const t = useTranslations("Profile")
  const tContrib = useTranslations("Contributions")
  const locale = useLocale()
  const fpp = resolveContributionFpp(item.type, item.fppAwarded)
  const dateLabel = new Date(item.createdAt).toLocaleDateString(locale, {
    dateStyle: "medium",
  })
  const Icon = typeIcon(item.type)
  const typeLabel = tContrib(contributionTypeMessageKey(item.type))
  const title = item.entityLabel?.trim() || typeLabel
  const metaParts = [
    tContrib(`status_${item.status}`),
    dateLabel,
    item.entityLabel ? typeLabel : null,
    item.parentLabel?.trim() || null,
  ].filter(Boolean)

  return (
    <li className="px-0.5 py-0.5 sm:px-1">
      <button
        type="button"
        onClick={() => onSelect?.(item)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors",
          selected ? "bg-foreground/[0.06] ring-1 ring-foreground/20" : "hover:bg-muted/40",
        )}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-background/80 text-muted-foreground ring-1 ring-border/40">
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-tight text-foreground">{title}</p>
          <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">
            {metaParts.join(" · ")}
          </p>
        </div>

        <span
          className={cn(
            "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
            item.status === "approved"
              ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "bg-muted/70 text-muted-foreground",
          )}
          title={item.status === "approved" ? t("fppAwardedTitle") : t("fppPotentialTitle")}
        >
          {item.status === "approved" ? `+${fpp}` : fpp}
        </span>
      </button>
    </li>
  )
}

type ProfileContributionsListProps = {
  previewItems: ProfileContributionItem[]
  totalCount: number
  profileUserId: string
  isOwnProfile?: boolean
  selectedContributionId?: string | null
  onSelectContribution?: (item: ProfileContributionItem) => void
}

export function ProfileContributionsList({
  previewItems,
  totalCount,
  profileUserId,
  isOwnProfile = true,
  selectedContributionId = null,
  onSelectContribution,
}: ProfileContributionsListProps) {
  const t = useTranslations("Profile")
  const tContrib = useTranslations("Contributions")
  const [open, setOpen] = useState(false)
  const [dialogPage, setDialogPage] = useState(1)
  const [pages, setPages] = useState<Record<number, ProfileContributionItem[]>>({
    1: previewItems,
  })
  const [loadingPage, setLoadingPage] = useState(false)

  useEffect(() => {
    setPages({ 1: previewItems })
    setDialogPage(1)
  }, [previewItems])

  const totalPages = Math.max(1, Math.ceil(totalCount / PROFILE_CONTRIBUTIONS_PAGE_SIZE))
  const showSeeAll = totalCount > PROFILE_CONTRIBUTIONS_PAGE_SIZE
  const dialogItems = pages[dialogPage] ?? []

  const preview = useMemo(
    () => previewItems.slice(0, PROFILE_CONTRIBUTIONS_PAGE_SIZE),
    [previewItems],
  )

  async function ensurePage(page: number) {
    if (pages[page]) return
    setLoadingPage(true)
    const res = await listProfileContributionsPageAction(profileUserId, page)
    if (res.success) {
      setPages((prev) => ({ ...prev, [page]: res.items }))
    }
    setLoadingPage(false)
  }

  function goToPage(next: number) {
    const safe = Math.min(totalPages, Math.max(1, next))
    setDialogPage(safe)
    void ensurePage(safe)
  }

  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t(isOwnProfile ? "contributionsHeading" : "contributionsHeadingOther")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(isOwnProfile ? "contributionsSubtitle" : "contributionsSubtitleOther")}
          </p>
        </div>
        {showSeeAll ? (
          <button
            type="button"
            onClick={() => {
              setDialogPage(1)
              setOpen(true)
            }}
            className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("seeAll")}
            <ArrowRight className="h-3 w-3" aria-hidden />
          </button>
        ) : null}
      </div>

      {totalCount === 0 ? (
        <div className="rounded-xl border border-border/60 bg-muted/15 px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            {t(isOwnProfile ? "noContributions" : "noContributionsOther")}
          </p>
          {isOwnProfile ? (
            <Link
              href="/profile/contribute"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-primary"
            >
              {t("contributeCta")}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/60 bg-muted/15">
          {preview.map((item) => (
            <ContributionRow
              key={item.id}
              item={item}
              selected={item.id === selectedContributionId}
              onSelect={onSelectContribution}
            />
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[min(80vh,640px)] max-w-lg flex-col gap-4 overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t("contributionsSeeAllTitle")}</DialogTitle>
            <DialogDescription>
              {t(isOwnProfile ? "contributionsSubtitle" : "contributionsSubtitleOther")}
            </DialogDescription>
          </DialogHeader>

          <ul className="min-h-0 flex-1 divide-y divide-border/40 overflow-y-auto rounded-xl border border-border/60 bg-muted/15">
            {loadingPage && dialogItems.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                {t("contributionsSeeAllLoading")}
              </li>
            ) : (
              dialogItems.map((item) => (
                <ContributionRow
                  key={item.id}
                  item={item}
                  selected={item.id === selectedContributionId}
                  onSelect={onSelectContribution}
                />
              ))
            )}
          </ul>

          <nav
            className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between"
            aria-label={tContrib("feedPaginationNavAria")}
          >
            <p className="text-sm text-muted-foreground">
              {tContrib("feedPaginationSummary", { current: dialogPage, total: totalPages })}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={dialogPage <= 1 || loadingPage}
                onClick={() => goToPage(dialogPage - 1)}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "gap-1.5 pl-2",
                  (dialogPage <= 1 || loadingPage) && "pointer-events-none opacity-40",
                )}
                aria-label={tContrib("feedPaginationPrevAria")}
              >
                <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
                {tContrib("feedPaginationPrev")}
              </button>
              <button
                type="button"
                disabled={dialogPage >= totalPages || loadingPage}
                onClick={() => goToPage(dialogPage + 1)}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "gap-1.5 pr-2",
                  (dialogPage >= totalPages || loadingPage) && "pointer-events-none opacity-40",
                )}
                aria-label={tContrib("feedPaginationNextAria")}
              >
                {tContrib("feedPaginationNext")}
                <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
              </button>
            </div>
          </nav>
        </DialogContent>
      </Dialog>
    </section>
  )
}
