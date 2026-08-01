"use client"

import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { CheckCircle2, Clock } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type ScenePlaceContributeDoneVariant = "pending" | "approved"

export interface ScenePlaceContributeDoneViewProps {
  variant: ScenePlaceContributeDoneVariant
  sceneTitle: string
  placeNames: string[]
  sceneHref: string
  returnHref?: string
  className?: string
}

export function ScenePlaceContributeDoneView({
  variant,
  sceneTitle,
  placeNames,
  sceneHref,
  returnHref = "/profile/contribute",
  className,
}: ScenePlaceContributeDoneViewProps) {
  const t = useTranslations("Contribute.scenePlace")
  const isApproved = variant === "approved"
  const placesLabel = placeNames.join(" → ")

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

      <div className="mt-6 w-full max-w-[280px] space-y-1 text-sm">
        <p className="font-semibold text-foreground">{sceneTitle}</p>
        <p className="text-muted-foreground">{t("donePlaceLabel", { name: placesLabel })}</p>
      </div>

      {isApproved ? (
        <Button asChild className="mt-5 h-10 w-full max-w-[280px] rounded-lg text-sm font-semibold">
          <Link href={sceneHref}>{t("doneViewScene")}</Link>
        </Button>
      ) : null}

      <Button
        asChild
        variant={isApproved ? "outline" : "default"}
        className={cn("h-10 rounded-lg px-5 text-sm font-semibold", isApproved ? "mt-4 w-full max-w-[280px]" : "mt-6")}
      >
        <Link href={returnHref}>{t("doneBackContribute")}</Link>
      </Button>
    </motion.div>
  )
}
