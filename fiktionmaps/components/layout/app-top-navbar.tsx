"use client"

import Image from "next/image"
import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Link, useRouter } from "@/i18n/navigation"
import { UserMenu } from "@/components/layout/user-menu"
import { SearchInput } from "@/components/ui/search-input"
import { getActiveFictionsAction } from "@/src/fictions/infrastructure/next/fiction.actions"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"

export function AppTopNavbar() {
  const router = useRouter()
  const tNav = useTranslations("Nav")
  const tFictions = useTranslations("Fictions")
  const [search, setSearch] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [fictions, setFictions] = useState<FictionWithMedia[]>([])
  const [loaded, setLoaded] = useState(false)

  const query = search.trim()
  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    if (!q) return []
    return fictions
      .filter((f) => {
        const title = f.title.toLowerCase()
        const author = f.author?.toLowerCase() ?? ""
        const genre = f.genre?.toLowerCase() ?? ""
        return title.includes(q) || author.includes(q) || genre.includes(q)
      })
      .slice(0, 7)
  }, [fictions, query])

  async function ensureFictionsLoaded() {
    if (loaded) return
    try {
      const data = await getActiveFictionsAction()
      setFictions(data)
    } finally {
      setLoaded(true)
    }
  }

  function goToFiction(fiction: FictionWithMedia) {
    router.push(`/fictions/${fiction.slug ?? fiction.id}`)
    setIsFocused(false)
    setSearch("")
  }

  return (
    <header className="sticky top-0 z-40 h-[60px] border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90">
      <div className="mx-auto grid h-full w-full max-w-[1900px] grid-cols-[1fr_minmax(280px,520px)_1fr] items-center gap-4 px-4 sm:px-6 lg:px-10">
        <div className="flex min-w-0 items-center gap-3 justify-self-start">
          <Link href="/map" className="inline-flex shrink-0 items-center rounded-md">
            <Image
              src="/fiktionmaps-logo.svg"
              alt={tNav("logoAlt")}
              width={119}
              height={25}
              priority
              className="h-[22px] w-auto shrink-0 object-contain"
            />
          </Link>
        </div>
        <div
          className="relative w-full"
          onFocus={() => {
            setIsFocused(true)
            void ensureFictionsLoaded()
          }}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setIsFocused(false)
            }
          }}
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            size="compact"
            placeholder={tNav("searchFictions")}
            className="w-full rounded-full bg-background"
          />
          {isFocused && query.length > 0 ? (
            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border border-border bg-background shadow-lg">
              {filtered.length > 0 ? (
                <ul className="max-h-80 overflow-y-auto p-1">
                  {filtered.map((fiction) => (
                    <li key={fiction.id}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => goToFiction(fiction)}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-accent"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {fiction.type === "tv-series"
                              ? tFictions("typeTvBadge")
                              : fiction.type === "movie"
                                ? tFictions("typeMovie")
                                : fiction.type === "book"
                                  ? tFictions("typeBook")
                                  : fiction.type}
                          </span>
                          <span className="truncate text-sm font-medium text-foreground">{fiction.title}</span>
                        </span>
                        <span className="ml-2 shrink-0 text-xs text-muted-foreground">{fiction.year ?? ""}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-3 py-2 text-sm text-muted-foreground">{tNav("noMatchingFictions")}</div>
              )}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2 justify-self-end">
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
