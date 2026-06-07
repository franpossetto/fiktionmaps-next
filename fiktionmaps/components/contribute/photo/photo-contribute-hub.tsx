"use client"

import { useTranslations } from "next-intl"
import { Film, MapPin } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { FictionContributeLayout } from "@/components/contribute/fiction/fiction-contribute-layout"
import { CONTRIBUTION_FPP } from "@/src/contributions/domain/contribution.config"

export function PhotoContributeHub() {
  const t = useTranslations("Contribute.photo")
  const fpp = CONTRIBUTION_FPP.add_photo

  return (
    <FictionContributeLayout leftAside={null} rightAside={null}>
      <div className="mx-auto w-full max-w-lg px-4 py-10">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("hubTitle")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("hubDescription")}</p>
        <p className="mt-4 text-sm text-muted-foreground">{t("fppHint", { count: fpp })}</p>

        <ul className="mt-8 space-y-3">
          <li>
            <Link
              href="/contribute/photo/place"
              className="flex items-start gap-4 rounded-xl border border-border/60 bg-muted/15 px-4 py-4 transition-colors hover:border-foreground/25 hover:bg-muted/30"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MapPin className="size-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block font-medium text-foreground">{t("hubPlaceTitle")}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{t("hubPlaceDescription")}</span>
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/contribute/photo/fiction"
              className="flex items-start gap-4 rounded-xl border border-border/60 bg-muted/15 px-4 py-4 transition-colors hover:border-foreground/25 hover:bg-muted/30"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Film className="size-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block font-medium text-foreground">{t("hubFictionTitle")}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{t("hubFictionDescription")}</span>
              </span>
            </Link>
          </li>
        </ul>
      </div>
    </FictionContributeLayout>
  )
}
