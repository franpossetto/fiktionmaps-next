"use client"

import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  /** "default" = hero-style (larger), "compact" = sticky bar style */
  size?: "default" | "compact"
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className,
  size = "default",
}: SearchInputProps) {
  const isCompact = size === "compact"
  return (
    <div
      className={cn(
        "flex items-center border border-border bg-card/80 backdrop-blur-sm text-foreground",
        isCompact
          ? "gap-2 rounded-md px-3 py-1.5"
          : "gap-3 rounded-lg px-3 py-2.5",
        className,
      )}
    >
      <Search
        className={cn("shrink-0 text-muted-foreground", isCompact ? "h-3.5 w-3.5" : "h-4 w-4")}
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  )
}
