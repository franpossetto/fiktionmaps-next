"use client"

import Image from "next/image"
import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { CheckCircle2, Clock } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type PlaceContributeDoneVariant = "pending" | "approved"

export interface PlaceContributeDoneViewProps {
  variant: PlaceContributeDoneVariant
  placeName: string
  imageSrc: string | null
  placeHref: string
  returnHref?: string
  returnLabel?: string
  className?: string
}

export function PlaceContributeDoneView({
  variant,
  placeName,
  imageSrc,
  placeHref,
  returnHref,
  returnLabel,
  className,
}: PlaceContributeDoneViewProps) {
  const t = useTranslations("Contribute.place")
  const img = imageSrc?.trim() || DEFAULT_FICTION_COVER
  const isBlob = img.startsWith("blob:")
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
        <div className="mt-6 w-full max-w-[240px]">
          <div className="relative mx-auto aspect-[21/9] w-full overflow-hidden rounded-lg border border-border/60 bg-muted/30 shadow-sm">
            <Image src={img} alt="" fill className="object-cover" sizes="240px" unoptimized={isBlob} />
          </div>
          <p className="mt-4 text-base font-semibold text-foreground">{placeName}</p>
          <Button asChild className="mt-5 h-10 w-full rounded-lg text-sm font-semibold">
            <Link href={placeHref}>{t("doneViewPlace")}</Link>
          </Button>
        </div>
      ) : null}

      <Button
        asChild
        variant={isApproved ? "outline" : "default"}
        className={cn("h-10 rounded-lg px-5 text-sm font-semibold", isApproved ? "mt-4 w-full max-w-[240px]" : "mt-6")}
      >
        <Link href={returnHref ?? "/map"}>{returnLabel ?? t("backToMap")}</Link>
      </Button>
    </motion.div>
  )
}
