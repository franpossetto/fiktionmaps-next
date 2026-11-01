"use client"

import Image from "next/image"
import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react"
import { ChevronLeft, ChevronRight, Compass, MapPin } from "lucide-react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { FictionStoryCloseMap } from "@/components/fictions/story/fiction-story-close-map"
import type {
  FictionStoryCard,
  FictionStoryCloseCard,
  FictionStoryReelCard,
  FictionStoryTextCard,
  FictionStoryTone,
} from "@/components/fictions/story/build-fiction-story-cards"

function focusPosition(focus: { x: number; y: number } | null | undefined): string {
  return `${focus?.x ?? 50}% ${focus?.y ?? 50}%`
}

const TONE_SURFACE: Record<FictionStoryTone, string> = {
  wine: "bg-[#4a1528] text-[#fce8ee]",
  navy: "bg-[#15243d] text-[#e4edf8]",
  moss: "bg-[#1a2e24] text-[#e6f0e3]",
  sand: "bg-[#f0e2c4] text-[#3d2a12]",
  ink: "bg-zinc-950 text-zinc-50",
  paper: "bg-stone-100 text-zinc-950",
}

function isLightTone(tone: FictionStoryTone): boolean {
  return tone === "sand" || tone === "paper"
}

export function FictionStoryCarousel({
  cards,
  layout = "page",
}: {
  cards: FictionStoryCard[]
  /** `rail`: compact phone in the fiction right column. `page`: full-column deck. */
  layout?: "page" | "rail"
}) {
  const t = useTranslations("FictionStory")
  const isRail = layout === "rail"
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const total = cards.length
  const atStart = index <= 0
  const atEnd = index >= total - 1

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(total - 1, next))
      const scroller = scrollerRef.current
      if (!scroller) {
        setIndex(clamped)
        return
      }
      const width = scroller.clientWidth
      scroller.scrollTo({ left: clamped * width, behavior: "smooth" })
      setIndex(clamped)
    },
    [total],
  )

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return

    const sync = () => {
      const width = scroller.clientWidth
      if (width <= 0) return
      const next = Math.round(scroller.scrollLeft / width)
      setIndex((prev) => (prev === next ? prev : Math.max(0, Math.min(total - 1, next))))
    }

    scroller.addEventListener("scroll", sync, { passive: true })
    window.addEventListener("resize", sync)
    return () => {
      scroller.removeEventListener("scroll", sync)
      window.removeEventListener("resize", sync)
    }
  }, [total])

  useEffect(() => {
    if (isRail) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault()
        goTo(index + 1)
      } else if (event.key === "ArrowLeft") {
        event.preventDefault()
        goTo(index - 1)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [goTo, index, isRail])

  const pointerStartX = useRef<number | null>(null)

  const onTap = (event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (target.closest("a, button, [data-fiction-story-pin], .mapboxgl-marker")) return
    if (target.closest(".mapboxgl-map")) {
      const rect = event.currentTarget.getBoundingClientRect()
      if (event.clientX - rect.left < rect.width * 0.22) goTo(index - 1)
      return
    }
    if (pointerStartX.current != null && Math.abs(event.clientX - pointerStartX.current) > 12) return
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    if (x < rect.width * 0.28) goTo(index - 1)
    else goTo(index + 1)
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full flex-1 items-center justify-center",
        isRail ? "gap-0 px-0 py-0" : "gap-2 px-0 py-0 sm:gap-3 sm:px-4 sm:py-5",
      )}
    >
      {isRail ? null : (
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="hidden h-12 w-12 shrink-0 rounded-full border-border bg-background shadow-none @[920px]/rails:inline-flex"
          onClick={() => goTo(index - 1)}
          disabled={atStart}
          aria-label={t("previous")}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
      )}

      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-black",
          isRail
            ? "aspect-[9/16] h-auto max-h-full w-full max-w-full rounded-[1.35rem] border border-border/80 shadow-xl"
            : "h-full w-full sm:h-[min(100%,840px)] sm:w-auto sm:max-w-full sm:aspect-[9/16] sm:rounded-[1.75rem] sm:border sm:border-border/80 sm:shadow-2xl",
        )}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/55 to-transparent px-3 pb-10 pt-3 sm:px-4 sm:pt-4"
          aria-hidden
        >
          <div className="flex gap-1">
            {cards.map((card, i) => (
              <span
                key={card.id}
                className="h-[2.5px] min-w-0 flex-1 overflow-hidden rounded-full bg-white/25"
              >
                <span
                  className={cn(
                    "block h-full rounded-full bg-white transition-[width] duration-200",
                    i < index ? "w-full" : i === index ? "w-full" : "w-0",
                    i === index && "opacity-100",
                    i > index && "opacity-40",
                  )}
                />
              </span>
            ))}
          </div>
          <div className="mt-2 flex justify-end">
            <span className="text-[11px] tabular-nums text-white/80">
              {t("progress", { current: index + 1, total })}
            </span>
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="flex h-full w-full touch-pan-x snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onPointerDown={(event) => {
            pointerStartX.current = event.clientX
          }}
          onClick={onTap}
          role="region"
          aria-roledescription="carousel"
          aria-label={t("carouselLabel")}
        >
          {cards.map((card) => (
            <article
              key={card.id}
              className="relative h-full w-full shrink-0 snap-center snap-always"
            >
              {card.kind === "reel" ? (
                card.fit === "landscape" ? (
                  <LandscapeSlide card={card} compact={isRail} />
                ) : (
                  <PosterSlide card={card} compact={isRail} />
                )
              ) : card.kind === "text" ? (
                <TextSlide card={card} compact={isRail} />
              ) : (
                <CloseSlide
                  card={card}
                  compact={isRail}
                  active={cards[index]?.id === card.id}
                  onNextCity={card.nextCityLabel ? () => goTo(index + 1) : undefined}
                />
              )}
            </article>
          ))}
        </div>
      </div>

      {isRail ? null : (
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="hidden h-12 w-12 shrink-0 rounded-full border-border bg-background shadow-none @[920px]/rails:inline-flex"
          onClick={() => goTo(index + 1)}
          disabled={atEnd}
          aria-label={t("next")}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      )}
    </div>
  )
}

function PosterSlide({ card, compact }: { card: FictionStoryReelCard; compact?: boolean }) {
  const t = useTranslations("FictionStory")
  return (
    <div className="relative h-full w-full bg-black">
      <Image
        src={card.image}
        alt={card.title}
        fill
        className="object-contain object-top"
        sizes={compact ? "420px" : "(max-width: 640px) 100vw, 430px"}
        priority={card.id === "cover"}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/20" />
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 space-y-2 pt-20",
          compact ? "px-4 pb-6" : "px-5 pb-8 sm:px-6 sm:pb-10",
        )}
      >
        {card.kicker ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75">{card.kicker}</p>
        ) : null}
        <h2
          className={cn(
            "text-balance font-bold leading-[1.05] tracking-tight text-white",
            compact ? "text-2xl" : "text-3xl sm:text-4xl",
          )}
        >
          {card.title}
        </h2>
        {card.subtitle ? (
          <p className="flex items-center gap-1.5 text-sm text-white/80">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {card.subtitle}
          </p>
        ) : null}
        {card.href ? (
          <Link
            href={card.href}
            className="inline-flex pt-1 text-xs font-medium text-white/80 underline-offset-4 hover:text-white hover:underline"
          >
            {t("openPlace")}
          </Link>
        ) : null}
      </div>
    </div>
  )
}

function LandscapeSlide({ card, compact }: { card: FictionStoryReelCard; compact?: boolean }) {
  const t = useTranslations("FictionStory")
  const light = isLightTone(card.tone)
  const hasBody = Boolean(card.body)
  return (
    <div className={cn("flex h-full w-full flex-col", TONE_SURFACE[card.tone])}>
      <div className={cn("relative w-full shrink-0 overflow-hidden", hasBody ? "h-[42%]" : "h-[58%]")}>
        <Image
          src={card.image}
          alt={card.title}
          fill
          className="object-cover"
          style={{ objectPosition: focusPosition(card.imageFocus) }}
          sizes={compact ? "420px" : "(max-width: 640px) 100vw, 430px"}
          priority={card.id === "cover"}
        />
      </div>
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col",
          compact ? "px-5 pb-8 pt-5" : "px-6 pb-12 pt-6 sm:px-8 sm:pb-14 sm:pt-7",
        )}
      >
        {card.kicker ? (
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] opacity-60">{card.kicker}</p>
        ) : null}
        <h2
          className={cn(
            "text-balance font-bold leading-[1.05] tracking-tight",
            compact ? "text-2xl" : hasBody ? "text-[1.85rem] sm:text-[2.05rem]" : "text-3xl sm:text-[2.15rem]",
          )}
        >
          {card.title}
        </h2>
        {card.subtitle ? (
          <p className="mt-2 flex items-center gap-1.5 text-sm opacity-70">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {card.subtitle}
          </p>
        ) : null}
        {card.quote ? (
          <p
            className={cn("mb-1 mt-4 font-article leading-none opacity-25", compact ? "text-4xl" : "text-5xl")}
            aria-hidden
          >
            “
          </p>
        ) : null}
        {card.body ? (
          <p
            className={cn(
              "mt-4 min-h-0 overflow-hidden font-article leading-[1.3] tracking-tight",
              compact ? "text-[1.15rem]" : "text-[1.3rem] sm:text-[1.45rem]",
            )}
          >
            {card.body}
          </p>
        ) : null}
        {card.href ? (
          <Link
            href={card.href}
            className={cn(
              "mt-auto inline-flex pt-4 text-xs font-medium underline-offset-4 hover:underline",
              light ? "opacity-70 hover:opacity-100" : "text-white/70 hover:text-white",
            )}
          >
            {t("openPlace")}
          </Link>
        ) : null}
      </div>
    </div>
  )
}

function TextSlide({ card, compact }: { card: FictionStoryTextCard; compact?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col justify-end",
        compact ? "px-5 pb-8 pt-16" : "px-6 pb-12 pt-20 sm:px-8 sm:pb-14",
        TONE_SURFACE[card.tone],
      )}
    >
      {card.kicker ? (
        <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.16em] opacity-60">{card.kicker}</p>
      ) : null}
      {card.quote ? (
        <p className={cn("mb-3 font-article leading-none opacity-25", compact ? "text-5xl" : "text-6xl")} aria-hidden>
          “
        </p>
      ) : null}
      <p
        className={cn(
          "whitespace-pre-line font-article leading-[1.25] tracking-tight",
          compact ? "text-[1.45rem]" : "text-[1.65rem] sm:text-[1.9rem]",
        )}
      >
        {card.body}
      </p>
    </div>
  )
}

function CloseSlide({
  card,
  compact,
  active,
  onNextCity,
}: {
  card: FictionStoryCloseCard
  compact?: boolean
  active: boolean
  onNextCity?: () => void
}) {
  const t = useTranslations("FictionStory")
  const light = isLightTone(card.tone)
  const hasMap = card.pins.length > 0
  const nextCityButton = card.nextCityLabel && onNextCity ? (
    <button
      type="button"
      className={cn(
        "pointer-events-auto mt-3 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full text-sm font-semibold",
        hasMap || !light ? "bg-white text-zinc-950" : "bg-zinc-950 text-white",
      )}
      onClick={(event) => {
        event.stopPropagation()
        onNextCity()
      }}
    >
      {card.nextCityLabel}
      <ChevronRight className="h-4 w-4" />
    </button>
  ) : null

  if (!hasMap) {
    return (
      <div
        className={cn(
          "flex h-full w-full flex-col justify-end",
          compact ? "px-5 pb-8 pt-16" : "px-6 pb-12 pt-20 sm:px-8 sm:pb-14",
          TONE_SURFACE[card.tone],
        )}
      >
        <h2
          className={cn(
            "font-article leading-[1.2] tracking-tight",
            compact ? "text-[1.45rem]" : "text-[1.85rem] sm:text-[2.15rem]",
          )}
        >
          {card.title}
        </h2>
        <p className="mt-3 text-sm leading-6 opacity-70">{card.subtitle}</p>
        <Button
          asChild
          variant={compact ? "cta" : "outline"}
          className={cn(
            "mt-8 h-11 w-full justify-center",
            compact
              ? ""
              : light
                ? "border-current/25 bg-transparent hover:bg-black/5"
                : "border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white",
          )}
        >
          <Link href={card.mapHref}>
            <Compass className="h-4 w-4" />
            {t("exploreMap")}
          </Link>
        </Button>
        {nextCityButton}
      </div>
    )
  }

  return (
    <div className="relative h-full w-full bg-zinc-950">
      {active ? (
        <FictionStoryCloseMap mapId={card.id} pins={card.pins} center={card.mapCenter} zoom={card.mapZoom} />
      ) : (
        <div className="absolute inset-0 bg-zinc-900" />
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col justify-end">
        <span className="absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-black/80 to-transparent" />
        <span
          className={cn(
            "relative w-full space-y-2",
            compact ? "px-4 pb-6" : "px-5 pb-8 sm:px-8 sm:pb-10",
          )}
        >
          <span
            className={cn(
              "block text-balance font-article leading-[1.15] tracking-tight text-white",
              compact ? "text-[1.45rem]" : "text-[1.75rem] sm:text-[2rem]",
            )}
          >
            {card.title}
          </span>
          <span className="block text-sm leading-6 text-white/75">{card.subtitle}</span>
          <Link
            href={card.mapHref}
            className={cn(
              "pointer-events-auto mt-3 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full text-sm font-semibold",
              card.nextCityLabel
                ? "border border-white/80 bg-transparent text-white"
                : "bg-white text-zinc-950",
            )}
          >
            <Compass className="h-4 w-4" />
            {t("exploreMap")}
          </Link>
          {nextCityButton}
        </span>
      </div>
    </div>
  )
}
