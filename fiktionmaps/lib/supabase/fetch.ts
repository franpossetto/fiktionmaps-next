const GET_ATTEMPTS = 3
const RETRY_STATUSES = new Set([502, 503, 504])

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isTransientNetworkError(error: unknown): boolean {
  if (!(error instanceof Error) || error.name === "AbortError") return false
  if (error instanceof TypeError) return true
  const code =
    (error as { code?: string }).code ??
    (error as { cause?: { code?: string } }).cause?.code
  return (
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "EAI_AGAIN" ||
    code === "UND_ERR_SOCKET" ||
    code === "UND_ERR_CONNECT_TIMEOUT" ||
    code === "UND_ERR_HEADERS_TIMEOUT" ||
    code === "UND_ERR_BODY_TIMEOUT"
  )
}

/**
 * Fetch used by the Supabase clients.
 * Reads retry a dropped socket. Next must not cache these GETs: the data cache is `unstable_cache`.
 */
export async function supabaseFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase()
  const attempts = method === "GET" || method === "HEAD" ? GET_ATTEMPTS : 1
  let lastError: unknown

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(input, { ...init, cache: "no-store" })
      if (
        attempt < attempts &&
        RETRY_STATUSES.has(response.status) &&
        !init?.signal?.aborted
      ) {
        await response.body?.cancel().catch(() => undefined)
        await wait(40 * attempt)
        continue
      }
      return response
    } catch (error) {
      lastError = error
      if (attempt >= attempts || !isTransientNetworkError(error) || init?.signal?.aborted) {
        throw error
      }
      await wait(40 * attempt)
    }
  }

  throw lastError instanceof Error ? lastError : new TypeError("fetch failed")
}

export function isSupabaseFetchFailureMessage(message: string): boolean {
  return message.startsWith("TypeError: fetch failed") || message.startsWith("FetchError:")
}

/** A read failed before PostgREST answered. Must not be stored by `unstable_cache`. */
export class SupabaseNetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "SupabaseNetworkError"
  }
}

export function throwIfSupabaseFetchFailed(error: { message: string }): void {
  if (isSupabaseFetchFailureMessage(error.message)) {
    throw new SupabaseNetworkError(error.message)
  }
}

export function supabaseFetchFailureLog(error: { message: string; details?: string }): string {
  const cause = error.details
    ?.split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("Caused by:"))
  return cause ? `${error.message} (${cause})` : error.message
}
