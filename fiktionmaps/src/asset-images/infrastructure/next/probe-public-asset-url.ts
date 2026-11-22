export type PublicAssetProbe = {
  reachable: boolean
  missing: boolean
  byteLength: number | null
}

function byteLengthFromHeaders(res: Response): number | null {
  const raw = res.headers.get("content-length")
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? n : null
}

/**
 * Probe the public object. Supabase Storage returns HTTP 400 (JSON status 404)
 * for missing files; other failures are treated as inconclusive, not missing.
 */
export async function probePublicAssetUrl(url: string): Promise<PublicAssetProbe> {
  try {
    const head = await fetch(url, { method: "HEAD", cache: "no-store" })
    if (head.ok) {
      return { reachable: true, missing: false, byteLength: byteLengthFromHeaders(head) }
    }
    if (head.status !== 405 && head.status !== 501) {
      return {
        reachable: false,
        missing: head.status === 400 || head.status === 404 || head.status === 410,
        byteLength: null,
      }
    }
    const get = await fetch(url, { method: "GET", cache: "no-store" })
    if (!get.ok) {
      return {
        reachable: false,
        missing: get.status === 400 || get.status === 404 || get.status === 410,
        byteLength: null,
      }
    }
    const byteLength = byteLengthFromHeaders(get)
    await get.body?.cancel()
    return { reachable: true, missing: false, byteLength }
  } catch {
    return { reachable: false, missing: false, byteLength: null }
  }
}
