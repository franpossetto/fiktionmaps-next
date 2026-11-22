import { routing } from "@/i18n/routing"
import { getSiteUrl } from "@/lib/site"

function catalogPath(path: string): string {
  return `${getSiteUrl()}/${routing.defaultLocale}${path}`
}

export function fictionCatalogUrl(slug: string): string {
  return catalogPath(`/fictions/${encodeURIComponent(slug)}`)
}

export function placeCatalogUrl(fictionSlug: string, placeSlug: string): string {
  return catalogPath(`/fictions/${encodeURIComponent(fictionSlug)}/places/${encodeURIComponent(placeSlug)}`)
}

export function sceneCatalogUrl(fictionSlug: string, sceneId: string): string {
  return catalogPath(`/fictions/${encodeURIComponent(fictionSlug)}/scenes/${encodeURIComponent(sceneId)}`)
}
