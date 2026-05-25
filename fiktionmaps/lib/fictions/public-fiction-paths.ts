/** Public fiction detail URLs (canonical under `/fictions/`). Map deep links use `/map?fiction={uuid}&place={uuid}`. */

export function publicFictionPlacePath(fictionSlug: string, placeSlug: string): string {
  return `/fictions/${encodeURIComponent(fictionSlug)}/places/${encodeURIComponent(placeSlug)}`
}

export function publicFictionScenePath(slug: string, sceneId: string): string {
  return `/fictions/${encodeURIComponent(slug)}/scenes/${encodeURIComponent(sceneId)}`
}
