"use client"

import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { PlaceRelationKind } from "@/src/places/domain/place-relation-kind"

export interface PlaceRelationKindBadgeProps {
  value: PlaceRelationKind
  className?: string
}

export function PlaceRelationKindBadge({ value, className }: PlaceRelationKindBadgeProps) {
  const t = useTranslations("Places")

  return (
    <Badge variant="outline" className={cn("text-xs", className)}>
      {t(`relationKind_${value}`)}
    </Badge>
  )
}
