"use client"

import { Shield } from "lucide-react"
import { useTranslations } from "next-intl"
import type { UserRole } from "@/src/users/domain/user.dtos"

type SettingsPermissionAsideProps = {
  role: UserRole
}

export function SettingsPermissionAside({ role }: SettingsPermissionAsideProps) {
  const t = useTranslations("Profile")
  const ts = useTranslations("Settings")

  return (
    <section className="space-y-2">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {t("permissionHeading")}
      </h2>
      <div className="rounded-xl bg-muted/25 px-3 py-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-background/80 text-foreground ring-1 ring-border/50">
            <Shield className="h-3.5 w-3.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground">{t(`role_${role}`)}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {t(`roleDescription_${role}`)}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/80">
              {ts("account.permissionSectionDescription")}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
