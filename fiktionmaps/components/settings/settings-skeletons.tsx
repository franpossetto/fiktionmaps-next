import type { ReactNode } from "react"
import { FictionContributeLayout } from "@/components/contribute/fiction/fiction-contribute-layout"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import {
  FORM_CARD_BODY_CLASS,
  FORM_CARD_CLASS,
  FORM_CARD_FOOTER_CLASS,
  FORM_FIELD_GRID_CLASS,
} from "@/components/ui/form-card"
import { SETTINGS_SECTION_IDS } from "./settings-sections"

function FieldSkeleton({
  rows = 1,
  withHint = false,
  className,
}: {
  rows?: number
  withHint?: boolean
  className?: string
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className={rows > 1 ? "h-20 w-full" : "h-10 w-full"} />
      {withHint ? <Skeleton className="h-3 w-40 max-w-full" /> : null}
    </div>
  )
}

export function SettingsUserHeaderSkeleton() {
  return (
    <div className="flex items-center gap-3 p-1">
      <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  )
}

export function SettingsPermissionAsideSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3 w-20" />
      <div className="rounded-xl bg-muted/25 px-3 py-3">
        <div className="flex items-start gap-2.5">
          <Skeleton className="mt-0.5 h-7 w-7 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        </div>
      </div>
    </div>
  )
}

function SubsectionHeadingSkeleton({ descriptionLines = 1 }: { descriptionLines?: number }) {
  return (
    <div>
      <div className="flex min-w-0 items-center gap-3">
        <span className="h-7 w-1 shrink-0 rounded-full bg-muted" aria-hidden />
        <Skeleton className="h-5 w-44" />
      </div>
      <div className="mt-2 space-y-1.5">
        {Array.from({ length: descriptionLines }, (_, index) => (
          <Skeleton
            key={index}
            className={cn("h-4", index === descriptionLines - 1 ? "w-1/2" : "w-full")}
          />
        ))}
      </div>
    </div>
  )
}

function CardSkeleton({
  children,
  actionClassName = "w-36",
}: {
  children: ReactNode
  actionClassName?: string
}) {
  return (
    <div className={FORM_CARD_CLASS}>
      <div className={FORM_CARD_BODY_CLASS}>{children}</div>
      <div className={FORM_CARD_FOOTER_CLASS}>
        <Skeleton className={cn("h-10", actionClassName)} />
      </div>
    </div>
  )
}

/** Mirrors the account panel: personal info card, password card, reset-link card. */
export function SettingsAccountSectionSkeleton() {
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <SubsectionHeadingSkeleton />
        <CardSkeleton>
          <div className={FORM_FIELD_GRID_CLASS}>
            <FieldSkeleton withHint />
            <FieldSkeleton withHint />
            <FieldSkeleton />
            <FieldSkeleton />
            <FieldSkeleton />
            <FieldSkeleton />
            <FieldSkeleton className="sm:col-span-2" rows={3} />
          </div>
        </CardSkeleton>
      </section>

      <section className="space-y-4">
        <SubsectionHeadingSkeleton descriptionLines={2} />
        <div className="space-y-6">
          <CardSkeleton>
            <div className={FORM_FIELD_GRID_CLASS}>
              <FieldSkeleton className="sm:col-span-2" />
              <FieldSkeleton withHint />
              <FieldSkeleton />
            </div>
          </CardSkeleton>

          <CardSkeleton actionClassName="w-32">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </CardSkeleton>
        </div>
      </section>
    </div>
  )
}

function SettingsNavSkeleton({ variant = "rail" }: { variant?: "rail" | "compact" }) {
  if (variant === "compact") {
    return (
      <div className="flex gap-2 overflow-hidden">
        {SETTINGS_SECTION_IDS.map((id) => (
          <Skeleton key={id} className="h-7 w-24 shrink-0 rounded-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="w-full min-w-0">
      <Skeleton className="mb-3 ml-3 h-3 w-16" />
      <div className="space-y-0.5">
        {SETTINGS_SECTION_IDS.map((id) => (
          <Skeleton key={id} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

/** Whole-route placeholder used by `settings/loading.tsx` while the shell streams in. */
export function SettingsPageSkeleton({ className }: { className?: string }) {
  return (
    <FictionContributeLayout
      className={cn(className)}
      leftAside={
        <div className="mx-auto w-full max-w-full space-y-5 pt-1">
          <SettingsUserHeaderSkeleton />
          <SettingsNavSkeleton />
        </div>
      }
      rightAside={
        <div className="w-full min-w-0 max-w-full space-y-5 pt-1">
          <SettingsPermissionAsideSkeleton />
        </div>
      }
    >
      <div className="w-full min-w-0 px-4 pb-10 sm:px-5">
        <div className="mb-6 space-y-4 min-[900px]:hidden">
          <SettingsUserHeaderSkeleton />
          <SettingsNavSkeleton variant="compact" />
        </div>

        <div className="mb-8">
          <Skeleton className="h-7 w-40" />
        </div>

        <SettingsAccountSectionSkeleton />
      </div>
    </FictionContributeLayout>
  )
}
