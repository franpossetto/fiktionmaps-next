/** Top-nav search scope (UI contract, not persistence). */

export type NavSearchScope =
  | { kind: "global" }
  | {
      kind: "fiction"
      label: string
      imageUrl: string | null
      fictionId: string
      fictionSlug: string
      clearHref: "/fictions"
    }
  | {
      kind: "place"
      label: string
      imageUrl: string | null
      fictionId: string
      fictionSlug: string
      placeId: string
      placeSlug: string
      clearHref: string
    }
