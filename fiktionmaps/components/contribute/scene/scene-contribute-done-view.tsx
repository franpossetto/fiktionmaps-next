"use client"

import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { CheckCircle2, Clock, Film } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type SceneContributeDoneVariant = "pending" | "approved"

export interface SceneContributeDoneViewProps {
  variant: SceneContributeDoneVariant
  title: string
  videoPreviewUrl: string | null
  /** App path without locale, e.g. `/fictions/my-slug/scenes/scene-id`. */
  sceneHref: string
  returnHref: string
  returnLabel: string
  className?: string
}

export function SceneContributeDoneView({
  variant,
  title,
  videoPreviewUrl,
  sceneHref,
  returnHref,
  returnLabel,
  className,
}: SceneContributeDoneViewProps) {
  const t = useTranslations("Contribute.scene")
  const isApproved = variant === "approved"

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn("flex w-full max-w-md flex-col items-center text-center", className)}
    >
      <div
        className={cn(
          "flex size-14 items-center justify-center rounded-full",
          isApproved ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-primary/10 text-primary",
        )}
      >
        {isApproved ? <CheckCircle2 className="size-7" aria-hidden /> : <Clock className="size-7" aria-hidden />}
      </div>

      <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {isApproved ? t("doneApprovedTitle") : t("donePendingTitle")}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground sm:text-base">
        {isApproved ? t("doneApprovedMessage") : t("donePendingMessage")}
      </p>

      {isApproved ? (
        <div className="mt-6 w-full max-w-[280px]">
          <div className="relative mx-auto aspect-video w-full overflow-hidden rounded-lg border border-border/60 bg-black shadow-sm">
            {videoPreviewUrl ? (
              <video src={videoPreviewUrl} className="h-full w-full object-cover" muted playsInline />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground/70">
                <Film className="h-8 w-8" aria-hidden />
              </div>
            )}
          </div>
          <p className="mt-4 text-base font-semibold text-foreground">{title}</p>
          <Button asChild className="mt-5 h-10 w-full rounded-lg text-sm font-semibold">
            <Link href={sceneHref}>{t("doneViewScene")}</Link>
          </Button>
        </div>
      ) : null}

      <Button
        asChild
        variant={isApproved ? "outline" : "default"}
        className={cn("h-10 rounded-lg px-5 text-sm font-semibold", isApproved ? "mt-4 w-full max-w-[280px]" : "mt-6")}
      >
        <Link href={returnHref}>{returnLabel}</Link>
      </Button>
    </motion.div>
  )
}
