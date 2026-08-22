"use client"

import { useMemo, useState } from "react"
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
import { resolveContributionFpp } from "@/src/contributions/domain/contribution.config"
import type {
  ContributionType,
  ProfileContributionItem,
} from "@/src/contributions/domain/contribution.entity"
import { contributionTypeMessageKey } from "@/components/contributions/contribution-type-label"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 10

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

type ProfileContributionsListProps = {
  contributions: ProfileContributionItem[]
  isOwnProfile?: boolean
  selectedContributionId?: string | null
  onSelectContribution?: (item: ProfileContributionItem) => void
}

export function ProfileContributionsList({
  contributions,
  isOwnProfile = true,
  selectedContributionId = null,
  onSelectContribution,
}: ProfileContributionsListProps) {
  const t = useTranslations("Profile")
  const tContrib = useTranslations("Contributions")
  const locale = useLocale()
  const [page, setPage] = useState(1)

  const totalPages = Math.max(1, Math.ceil(contributions.length / PAGE_SIZE))
  const safePage = Math.min(Math.max(1, page), totalPages)

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return contributions.slice(start, start + PAGE_SIZE)
  }, [contributions, safePage])

  const showPagination = contributions.length > PAGE_SIZE

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t(isOwnProfile ? "contributionsHeading" : "contributionsHeadingOther")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(isOwnProfile ? "contributionsSubtitle" : "contributionsSubtitleOther")}
          </p>
        </div>
      </div>

      {contributions.length === 0 ? (
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
        <>
          <ul className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/60 bg-muted/15">
            {pageItems.map((item) => {
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

              const isSelected = item.id === selectedContributionId

              return (
                <li key={item.id} className="px-0.5 py-0.5 sm:px-1">
                  <button
                    type="button"
                    onClick={() => onSelectContribution?.(item)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors",
                      isSelected
                        ? "bg-foreground/[0.06] ring-1 ring-foreground/20"
                        : "hover:bg-muted/40",
                    )}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-background/80 text-muted-foreground ring-1 ring-border/40">
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium leading-tight text-foreground">
                        {title}
                      </p>
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
                      title={
                        item.status === "approved"
                          ? t("fppAwardedTitle")
                          : t("fppPotentialTitle")
                      }
                    >
                      {item.status === "approved" ? `+${fpp}` : fpp}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          {showPagination ? (
            <nav
              className="flex flex-col items-center gap-3 border-t border-border/50 pt-4 sm:flex-row sm:justify-between"
              aria-label={tContrib("feedPaginationNavAria")}
            >
              <p className="text-sm text-muted-foreground">
                {tContrib("feedPaginationSummary", { current: safePage, total: totalPages })}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "gap-1.5 pl-2",
                    safePage <= 1 && "pointer-events-none opacity-40",
                  )}
                  aria-label={tContrib("feedPaginationPrevAria")}
                >
                  <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
                  {tContrib("feedPaginationPrev")}
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "gap-1.5 pr-2",
                    safePage >= totalPages && "pointer-events-none opacity-40",
                  )}
                  aria-label={tContrib("feedPaginationNextAria")}
                >
                  {tContrib("feedPaginationNext")}
                  <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
                </button>
              </div>
            </nav>
          ) : null}
        </>
      )}
    </section>
  )
}
