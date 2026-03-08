"use client"

import { Film, Check, Search } from "lucide-react"
import type { Fiction } from "@/lib/modules/fictions"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useState, useMemo } from "react"
import Image from "next/image"
import { DEFAULT_FICTION_COVER } from "@/lib/constants/placeholders"

interface FictionSelectorProps {
  availableFictions: Fiction[]
  selectedFictionIds: string[]
  onToggleFiction: (fictionId: string) => void
}

export function FictionSelector({
  availableFictions,
  selectedFictionIds,
  onToggleFiction,
}: FictionSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const count = selectedFictionIds.length

  const filtered = useMemo(() => {
    if (!search.trim()) return availableFictions
    const q = search.toLowerCase()
    return availableFictions.filter(
      (f) =>
        f.title.toLowerCase().includes(q) ||
        f.genre.toLowerCase().includes(q) ||
        f.type.toLowerCase().includes(q),
    )
  }, [search, availableFictions])

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) setSearch("")
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 border-chrome-border bg-chrome/90 text-foreground backdrop-blur-md hover:bg-chrome-hover"
        >
          <Film className="h-4 w-4 text-primary" />
          <span>
            {count === availableFictions.length
              ? "All fictions"
              : count === 0
                ? "Select Fiction"
                : `${count} fiction${count > 1 ? "s" : ""}`}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogTitle className="sr-only">Select fiction</DialogTitle>
        {/* Search header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search fictions..."
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            autoFocus
          />
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto space-y-1 p-3">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {availableFictions.length === 0
                ? "No fictions in this city"
                : "No results found"}
            </p>
          ) : (
            filtered.map((fiction) => {
              const isSelected = selectedFictionIds.includes(fiction.id)
              return (
                <button
                  key={fiction.id}
                  onClick={() => onToggleFiction(fiction.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                    isSelected
                      ? "bg-primary/10"
                      : "hover:bg-secondary"
                  }`}
                >
                  {/* Cover thumbnail */}
                  <div className="relative w-10 aspect-[2/3] shrink-0 overflow-hidden rounded-md border border-border">
                    <Image
                      src={fiction.coverImage?.trim() || DEFAULT_FICTION_COVER}
                      alt={fiction.title}
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className="text-sm font-semibold text-foreground">{fiction.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{fiction.year}</span>
                      <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                        {fiction.type === "tv-series" ? "TV" : fiction.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{fiction.genre}</span>
                    </div>
                  </div>

                  {/* Check */}
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      isSelected
                        ? "border-primary bg-primary"
                        : "border-muted-foreground/30 bg-transparent"
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
