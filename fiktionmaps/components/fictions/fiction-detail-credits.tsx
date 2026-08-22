"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { FictionDetailSectionHeading } from "@/components/fictions/fiction-detail-section-heading"
import type { FictionPerson } from "@/src/persons/domain/person.entity"
import {
  groupFictionPersonsByPerson,
  isFictionPersonRole,
  type FictionPersonCreditGroup,
} from "@/lib/persons/sort-fiction-persons-by-role"

const PREVIEW_LIMIT = 3

type FictionDetailCreditsProps = {
  credits: FictionPerson[]
  fictionTitle: string
}

function CreditRow({
  credit,
  roleLabel,
}: {
  credit: FictionPersonCreditGroup
  roleLabel: string
}) {
  const initial = credit.name.trim().charAt(0).toUpperCase() || "?"
  return (
    <li className="flex items-center gap-3 px-3 py-3 sm:gap-4 sm:px-5 sm:py-4">
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border/60 bg-muted/40 sm:h-12 sm:w-12">
        {credit.photo_url?.trim() ? (
          <Image
            src={credit.photo_url.trim()}
            alt=""
            fill
            className="object-cover"
            sizes="48px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
            {initial}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium text-foreground">{credit.name}</p>
        <p className="text-sm text-muted-foreground">{roleLabel}</p>
      </div>
    </li>
  )
}

export function FictionDetailCredits({ credits, fictionTitle }: FictionDetailCreditsProps) {
  const t = useTranslations("Fictions")
  const [open, setOpen] = useState(false)

  const grouped = useMemo(() => groupFictionPersonsByPerson(credits), [credits])
  if (grouped.length === 0) return null

  const preview = grouped.slice(0, PREVIEW_LIMIT)
  const hasMore = grouped.length > PREVIEW_LIMIT

  function roleLabel(role: string): string {
    return isFictionPersonRole(role) ? t(`role_${role}` as "role_director") : role
  }

  function rolesLabel(roles: string[]): string {
    return roles.map(roleLabel).join(" · ")
  }

  return (
    <section className="space-y-5 border-t border-border/60 pt-10">
      <FictionDetailSectionHeading title={t("creditsHeading")} count={grouped.length} />

      <ul className="divide-y divide-border/60 rounded-xl border border-border/40 bg-card/30">
        {preview.map((credit) => (
          <CreditRow
            key={credit.person_id}
            credit={credit}
            roleLabel={rolesLabel(credit.roles)}
          />
        ))}
      </ul>

      {hasMore ? (
        <>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("creditsSeeMore")}
          </button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-h-[min(80vh,560px)] max-w-md overflow-hidden p-0 sm:rounded-xl">
              <div className="border-b border-border/60 px-5 py-4">
                <DialogTitle className="text-left text-lg font-bold tracking-tight">
                  {t("creditsHeading")}
                </DialogTitle>
                <DialogDescription className="mt-1 truncate text-left text-sm text-muted-foreground">
                  {fictionTitle}
                </DialogDescription>
              </div>
              <ul className="max-h-[min(60vh,420px)] divide-y divide-border/60 overflow-y-auto">
                {grouped.map((credit) => (
                  <CreditRow
                    key={credit.person_id}
                    credit={credit}
                    roleLabel={rolesLabel(credit.roles)}
                  />
                ))}
              </ul>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </section>
  )
}
