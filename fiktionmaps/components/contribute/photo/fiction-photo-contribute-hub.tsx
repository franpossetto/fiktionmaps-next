"use client"

import { useTranslations } from "next-intl"
import { ImageIcon, LayoutTemplate } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { FictionContributeLayout } from "@/components/contribute/fiction/fiction-contribute-layout"
export function FictionPhotoContributeHub() {
  const t = useTranslations("Contribute.photo.fictionHub")
  const description = t("description")

  return (
    <FictionContributeLayout leftAside={null} rightAside={null}>
      <div className="mx-auto w-full max-w-lg px-4 py-10">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}

        <ul className={description ? "mt-8 space-y-3" : "mt-6 space-y-3"}>
          <li>
            <Link
              href="/contribute/photo/fiction/cover"
              className="flex items-start gap-4 rounded-xl border border-border/60 bg-muted/15 px-4 py-4 transition-colors hover:border-foreground/25 hover:bg-muted/30"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ImageIcon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block font-medium text-foreground">{t("coverTitle")}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{t("coverDescription")}</span>
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/contribute/photo/fiction/hero"
              className="flex items-start gap-4 rounded-xl border border-border/60 bg-muted/15 px-4 py-4 transition-colors hover:border-foreground/25 hover:bg-muted/30"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <LayoutTemplate className="size-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block font-medium text-foreground">{t("heroTitle")}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{t("heroDescription")}</span>
              </span>
            </Link>
          </li>
        </ul>
      </div>
    </FictionContributeLayout>
  )
}
