"use client"

import { useTranslations } from "next-intl"

/** Rail derecho en la pantalla de elección de tipo (antes del wizard de ficha). */
export function FictionContributeCategoryAside() {
  const t = useTranslations("Contribute.categoryAside")

  return (
    <div className="mx-auto w-full max-w-[260px] space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("heading")}</h2>
      <div className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
        <p>{t("body1")}</p>
        <p className="mt-3">
          {t.rich("body2", {
            bold: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
          })}
        </p>
      </div>
    </div>
  )
}
