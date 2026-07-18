"use client"

import { Link } from "@/i18n/navigation"
import { usePathname } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { ArrowLeft } from "lucide-react"

export function HuntSectionNav() {
  const t = useTranslations("Contribute.huntWork.nav")
  const pathname = usePathname()
  const isNew = pathname.includes("/contribute/hunt/new")

  if (!isNew) return null

  return (
    <Link
      href="/contribute/hunt"
      className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      {t("work")}
    </Link>
  )
}
