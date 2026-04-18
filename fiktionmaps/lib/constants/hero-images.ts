export const HERO_IMAGES = [
  {
    id: "cinema-seat",
    label: "Cinema seats",
    url: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1200&q=90",
  },
  {
    id: "projector",
    label: "Film projector",
    url: "https://images.unsplash.com/photo-1518895949257-7621c3c786d4?w=1200&q=90",
  },
  {
    id: "film-reel",
    label: "Film reel",
    url: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1200&q=90",
  },
  {
    id: "city-neon",
    label: "Neon city",
    url: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=90",
  },
  {
    id: "backstage",
    label: "Backstage light",
    url: "https://images.unsplash.com/photo-1515165562835-c4c9e0737eaa?w=1200&q=90",
  },
  {
    id: "drive-in",
    label: "Drive-in cinema",
    url: "https://images.unsplash.com/photo-1594905791954-6675fc969971?w=1200&q=90",
  },
  {
    id: "movie-street",
    label: "Movie street",
    url: "https://images.unsplash.com/photo-1495433324511-bf8e92934d90?w=1200&q=90",
  },
  {
    id: "script",
    label: "Script pages",
    url: "https://images.unsplash.com/photo-1518133835872-c62766e43e83?w=1200&q=90",
  },
] as const

export const DEFAULT_HERO_URL = HERO_IMAGES[0].url

export type HeroPosition = {
  x: number
  y: number
}

const clampPercent = (value: number) => Math.max(0, Math.min(100, value))

export const DEFAULT_HERO_POSITION: HeroPosition = { x: 50, y: 50 }

const STORAGE_KEY = "fiktionmaps_hero_image"

function parseHeroValue(
  input?: string | null,
): { src: string; position: HeroPosition } {
  if (!input) {
    return { src: DEFAULT_HERO_URL, position: { ...DEFAULT_HERO_POSITION } }
  }

  const [src, hash] = input.split("#")
  if (!hash) {
    return { src, position: { ...DEFAULT_HERO_POSITION } }
  }

  const match = hash.match(/pos=([0-9.]+),([0-9.]+)/i)
  if (!match) {
    return { src, position: { ...DEFAULT_HERO_POSITION } }
  }

  const x = clampPercent(parseFloat(match[1]))
  const y = clampPercent(parseFloat(match[2]))

  return { src, position: { x, y } }
}

function buildHeroValue(src: string, position: HeroPosition): string {
  const cleanSrc = src.split("#")[0]
  const x = clampPercent(position.x)
  const y = clampPercent(position.y)

  if (Math.abs(x - 50) < 0.1 && Math.abs(y - 50) < 0.1) {
    return cleanSrc
  }

  const roundedX = Math.round(x * 10) / 10
  const roundedY = Math.round(y * 10) / 10
  return `${cleanSrc}#pos=${roundedX},${roundedY}`
}

export function getStoredHeroImage(): { src: string; position: HeroPosition } {
  if (typeof window === "undefined") {
    return { src: DEFAULT_HERO_URL, position: { ...DEFAULT_HERO_POSITION } }
  }

  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    return { src: DEFAULT_HERO_URL, position: { ...DEFAULT_HERO_POSITION } }
  }

  // Support both legacy "plain URL" values and new URL#pos=x,y format.
  const { src, position } = parseHeroValue(stored)
  const isKnownUrl = HERO_IMAGES.some((h) => h.url === src)

  return {
    src: isKnownUrl ? src : DEFAULT_HERO_URL,
    position,
  }
}

export function setStoredHeroImage(
  src: string,
  position: HeroPosition,
): void {
  if (typeof window === "undefined") return
  const value = buildHeroValue(src, position)
  localStorage.setItem(STORAGE_KEY, value)
}

// Backwards‑compatible helpers used in older code.
export function getStoredHeroImageUrl(): string {
  return getStoredHeroImage().src
}

export function setStoredHeroImageUrl(url: string): void {
  setStoredHeroImage(url, DEFAULT_HERO_POSITION)
}
