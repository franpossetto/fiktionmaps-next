"use client"

import type { ReactNode } from "react"
import Image from "next/image"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type ScopedSearchChip = {
  label: string
  imageUrl?: string | null
  onClear?: () => void
  clearLabel?: string
  /** Opens a popover listing selected items (parent must wrap input in `<Popover>`). */
  popoverTrigger?: boolean
}

/** Shared chip chrome for custom renderers (e.g. map fiction count popover). */
export const SCOPE_CHIP_CLASS =
  "inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-card py-0.5 pl-1 pr-1.5"

export function SearchScopeChip({ chip, compact }: { chip: ScopedSearchChip; compact?: boolean }) {
  return (
    <span
      className={cn(SCOPE_CHIP_CLASS, "shrink-0", compact ? "max-w-[9.5rem]" : "max-w-[11rem]")}
    >
      {chip.imageUrl ? (
        <span className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full bg-muted">
          <Image src={chip.imageUrl} alt="" fill className="object-cover" sizes="20px" />
        </span>
      ) : (
        <span className="h-5 w-5 shrink-0 rounded-full bg-muted" aria-hidden />
      )}
      <span className="truncate text-xs font-semibold text-foreground">{chip.label}</span>
      {chip.onClear ? (
        <button
          type="button"
          onClick={chip.onClear}
          className="ml-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={chip.clearLabel ?? "Clear"}
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      ) : null}
    </span>
  )
}

interface ScopedSearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Single scope chip (alias for one entry in `chips`). */
  chip?: ScopedSearchChip | null
  chips?: ScopedSearchChip[]
  /** Override chip UI (e.g. `PopoverTrigger` on map fiction count). */
  renderScopeChip?: (chip: ScopedSearchChip, index: number, compact: boolean) => ReactNode
  /** Extra chips after scope chips, before the text field (map fiction chips). */
  renderAfterChips?: ReactNode
  /** City + fiction chips stacked; caps chip row width only as this grows (map passes explicit count). */
  stackedChipCount?: number
  className?: string
  inputClassName?: string
}

/** Caps chip scroller so the text field keeps room (percent of the inner flex row). */
function chipRowMaxWidthClass(stackedCount: number): string | undefined {
  if (stackedCount <= 2) return "max-w-[min(100%,calc(100%-5.5rem))]"
  if (stackedCount === 3) return "max-w-[min(42%,calc(100%-5.5rem))]"
  if (stackedCount === 4) return "max-w-[min(52%,calc(100%-5.5rem))]"
  if (stackedCount === 5) return "max-w-[min(60%,calc(100%-5.5rem))]"
  return "max-w-[min(68%,calc(100%-5.5rem))]"
}

/** Reddit-style pill search: icon, optional scope chips, then query field. */
export function ScopedSearchInput({
  value,
  onChange,
  placeholder = "Search…",
  chip,
  chips,
  renderScopeChip,
  renderAfterChips,
  stackedChipCount,
  className,
  inputClassName,
}: ScopedSearchInputProps) {
  const scopeChips = chips ?? (chip ? [chip] : [])
  const multiChip = scopeChips.length > 1
  const hasChipRow = scopeChips.length > 0 || renderAfterChips != null
  const effectiveStackCount =
    stackedChipCount ?? scopeChips.length + (renderAfterChips != null ? 2 : 0)

  return (
    <div
      className={cn(
        "flex w-full min-w-0 min-h-10 items-center gap-2 overflow-hidden rounded-full border border-border bg-background px-3 py-1 text-foreground shadow-none transition-[box-shadow,border-color]",
        "focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/30",
        className,
      )}
    >
      <Search className="h-[18px] w-[18px] shrink-0 text-muted-foreground" aria-hidden />
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {hasChipRow ? (
          <div
            className={cn(
              "flex shrink-0 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              chipRowMaxWidthClass(effectiveStackCount),
            )}
          >
            {scopeChips.map((scopeChip, index) =>
              renderScopeChip ? (
                <span key={`${scopeChip.label}-${index}`} className="shrink-0">
                  {renderScopeChip(scopeChip, index, multiChip)}
                </span>
              ) : (
                <SearchScopeChip
                  key={`${scopeChip.label}-${index}`}
                  chip={scopeChip}
                  compact={multiChip}
                />
              ),
            )}
            {renderAfterChips}
          </div>
        ) : null}
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "min-w-[5rem] flex-1 basis-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground",
            inputClassName,
          )}
        />
      </div>
    </div>
  )
}
