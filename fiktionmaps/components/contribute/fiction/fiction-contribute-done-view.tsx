"use client"

import Image from "next/image"
import { useTranslations } from "next-intl"
import { motion } from "framer-motion"
import { CheckCircle2, Clock } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type FictionContributeDoneVariant = "pending" | "approved"

export interface FictionContributeDoneViewProps {
  variant: FictionContributeDoneVariant
  title: string
  coverSrc: string | null
  /** App path without locale, e.g. `/fictions/my-slug`. */
  fictionHref: string
  partialNote?: string
  className?: string
}

export function FictionContributeDoneView({
  variant,
  title,
  coverSrc,
  fictionHref,
  partialNote,
  className,
}: FictionContributeDoneViewProps) {
  const tf = useTranslations("Contribute.fiction")
  const cover = coverSrc?.trim() || DEFAULT_FICTION_COVER
  const isBlob = cover.startsWith("blob:")
  const isApproved = variant === "approved"

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn("flex w-full max-w-md flex-col items-center text-center", className)}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className={cn(
          "flex size-14 items-center justify-center rounded-full",
          isApproved ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-primary/10 text-primary",
        )}
      >
        {isApproved ? <CheckCircle2 className="size-7" aria-hidden /> : <Clock className="size-7" aria-hidden />}
      </motion.div>

      <h1 className="mt-5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        {isApproved ? tf("doneApprovedTitle") : tf("donePendingTitle")}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground sm:text-base">
        {isApproved ? tf("doneApprovedMessage") : tf("donePendingMessage")}
      </p>

      {partialNote ? (
        <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">{partialNote}</p>
      ) : null}

      {isApproved ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut", delay: 0.08 }}
          className="mt-6 w-full max-w-[200px]"
        >
          <div className="relative mx-auto aspect-[2/3] w-full overflow-hidden rounded-lg border border-border/60 bg-muted/30 shadow-sm">
            <Image
              src={cover}
              alt=""
              fill
              className="object-cover"
              sizes="200px"
              unoptimized={isBlob}
            />
          </div>
          <p className="mt-4 text-base font-semibold text-foreground">{title}</p>
          <Button asChild className="mt-5 h-10 w-full rounded-lg text-sm font-semibold">
            <Link href={fictionHref}>{tf("doneViewFiction")}</Link>
          </Button>
        </motion.div>
      ) : null}

      <Button
        asChild
        variant={isApproved ? "outline" : "default"}
        className={cn(
          "h-10 rounded-lg px-5 text-sm font-semibold",
          isApproved ? "mt-4 w-full max-w-[200px]" : "mt-6",
        )}
      >
        <Link href="/map">{tf("backToMap")}</Link>
      </Button>
    </motion.div>
  )
}
