"use client"

import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { PlaceShootEnvironment } from "@/src/places/domain/place-shoot-environment"

export interface PlaceShootEnvironmentBadgeProps {
  value: PlaceShootEnvironment
  className?: string
}

export function PlaceShootEnvironmentBadge({ value, className }: PlaceShootEnvironmentBadgeProps) {
  const t = useTranslations("Places")

  return (
    <Badge variant="outline" className={cn("text-xs", className)}>
      {t(`shootEnvironment_${value}`)}
    </Badge>
  )
}
