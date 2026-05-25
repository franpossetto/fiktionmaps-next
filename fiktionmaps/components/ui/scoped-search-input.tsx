"use client"

import Image from "next/image"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type ScopedSearchChip = {
  label: string
  imageUrl?: string | null
  onClear: () => void
  clearLabel: string
}

interface ScopedSearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  chip?: ScopedSearchChip | null
  className?: string
  inputClassName?: string
}

/** Reddit-style pill search: icon, optional scope chip, then query field. */
export function ScopedSearchInput({
  value,
  onChange,
  placeholder = "Search…",
  chip,
  className,
  inputClassName,
}: ScopedSearchInputProps) {
  return (
    <div
      className={cn(
        "flex h-10 w-full items-center gap-2 rounded-full border border-border bg-background px-3 text-foreground shadow-none transition-[box-shadow,border-color]",
        "focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/30",
        className,
      )}
    >
      <Search className="h-[18px] w-[18px] shrink-0 text-muted-foreground" aria-hidden />
      {chip ? (
        <span className="inline-flex max-w-[min(52%,220px)] shrink-0 items-center gap-1.5 rounded-md border border-border bg-card py-0.5 pl-1 pr-1.5">
          {chip.imageUrl ? (
            <span className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full bg-muted">
              <Image src={chip.imageUrl} alt="" fill className="object-cover" sizes="20px" />
            </span>
          ) : (
            <span className="h-5 w-5 shrink-0 rounded-full bg-muted" aria-hidden />
          )}
          <span className="truncate text-xs font-semibold text-foreground">{chip.label}</span>
          <button
            type="button"
            onClick={chip.onClear}
            className="ml-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={chip.clearLabel}
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        </span>
      ) : null}
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground",
          inputClassName,
        )}
      />
    </div>
  )
}
