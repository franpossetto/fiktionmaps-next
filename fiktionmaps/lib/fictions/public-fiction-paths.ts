/** Public fiction detail URLs (canonical under `/fictions/`). */

export function publicFictionPlacePath(slug: string, placeId: string): string {
  return `/fictions/${encodeURIComponent(slug)}/places/${encodeURIComponent(placeId)}`
}

export function publicFictionScenePath(slug: string, sceneId: string): string {
  return `/fictions/${encodeURIComponent(slug)}/scenes/${encodeURIComponent(sceneId)}`
}
