/** Segments from `usePathname()` (no locale prefix). */

export type FictionAppRoute =
  | { kind: "catalog" }
  | { kind: "fiction"; fictionSlug: string }
  | { kind: "place"; fictionSlug: string; placeSegment: string }
  | { kind: "scene"; fictionSlug: string; sceneId: string }

export function parseFictionAppRoute(pathname: string): FictionAppRoute | null {
  const path = (pathname.split("?")[0] ?? "").replace(/\/$/, "") || "/"
  if (!path.startsWith("/fictions")) return null
  if (path === "/fictions") return { kind: "catalog" }
  const rest = path.slice("/fictions".length)
  const segments = rest.split("/").filter(Boolean)
  if (segments.length === 1) {
    return { kind: "fiction", fictionSlug: decodeURIComponent(segments[0]!) }
  }
  if (segments.length === 3 && segments[1] === "places") {
    return {
      kind: "place",
      fictionSlug: decodeURIComponent(segments[0]!),
      placeSegment: decodeURIComponent(segments[2]!),
    }
  }
  if (segments.length === 3 && segments[1] === "scenes") {
    return {
      kind: "scene",
      fictionSlug: decodeURIComponent(segments[0]!),
      sceneId: decodeURIComponent(segments[2]!),
    }
  }
  return null
}
