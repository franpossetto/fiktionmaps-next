import createIntlMiddleware from "next-intl/middleware"
import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import type { Database } from "./supabase/database.types"
import { routing } from "./i18n/routing"
import { getSiteUrl } from "./lib/site"

const intlMiddleware = createIntlMiddleware(routing)
const CANONICAL_HOST = (() => {
  try {
    return new URL(getSiteUrl()).hostname.toLowerCase()
  } catch {
    return "fiktions.com"
  }
})()
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"])
const ENFORCE_CANONICAL_HOST = process.env.VERCEL_ENV
  ? process.env.VERCEL_ENV === "production"
  : process.env.NODE_ENV === "production"

/** Cap Auth work in Edge so a hung Supabase call cannot trigger MIDDLEWARE_INVOCATION_TIMEOUT (~25s). */
const AUTH_TIMEOUT_MS = 2500

const PROTECTED_PATHS = [
  "/profile",
  "/settings",
  "/admin",
  "/contributions",
  "/contribute",
  "/u",
  "/auth/update-password",
]

function isProtected(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  )
}

const localeList = routing.locales as readonly string[]

/** Strip locale prefix to get path for auth checks. e.g. /en/profile -> /profile */
function pathnameWithoutLocale(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean)
  if (segments.length > 0 && localeList.includes(segments[0])) {
    return "/" + segments.slice(1).join("/") || "/"
  }
  return pathname
}

function getLocaleFromPathname(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean)
  if (segments.length > 0 && localeList.includes(segments[0])) {
    return segments[0]
  }
  return routing.defaultLocale
}

function isValidSupabaseUrl(url: string | undefined): url is string {
  if (!url || typeof url !== "string") return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

/** Supabase SSR session cookies: `sb-<ref>-auth-token` (+ chunk suffixes). */
function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-") && name.includes("auth-token"))
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | "timeout"> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<"timeout">((resolve) => {
        timer = setTimeout(() => resolve("timeout"), ms)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

function redirectToLogin(request: NextRequest, pathname: string): NextResponse {
  const loginUrl = request.nextUrl.clone()
  const locale = getLocaleFromPathname(pathname)
  loginUrl.pathname = `/${locale}/login`
  loginUrl.searchParams.set("redirectTo", pathname)
  return NextResponse.redirect(loginUrl)
}

export async function middleware(request: NextRequest) {
  if (ENFORCE_CANONICAL_HOST) {
    const hostHeader = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? ""
    const hostname = hostHeader.split(":")[0].toLowerCase()
    const isLocalHost = LOCAL_HOSTS.has(hostname)
    if (!isLocalHost && hostname !== CANONICAL_HOST) {
      const canonicalUrl = request.nextUrl.clone()
      canonicalUrl.protocol = "https"
      canonicalUrl.host = CANONICAL_HOST
      return NextResponse.redirect(canonicalUrl, 308)
    }
  }

  const response = await intlMiddleware(request)
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location")
    // Avoid next-intl redirecting to /en/undefined or /en/undefinedundefined (see next-intl#2240)
    if (location?.includes("undefined")) {
      const safe = request.nextUrl.clone()
      safe.pathname = `/${routing.defaultLocale}/map`
      return NextResponse.redirect(safe)
    }
    return response
  }

  const pathname = request.nextUrl.pathname
  const pathWithoutLocale = pathnameWithoutLocale(pathname)
  const protectedPath = isProtected(pathWithoutLocale)
  const hasAuthCookie = hasSupabaseAuthCookie(request)

  // Public + anonymous: no Auth work (avoids edge hangs on /en, /contributors, etc.).
  if (!protectedPath && !hasAuthCookie) {
    return response
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  let authenticated = false
  if (isValidSupabaseUrl(supabaseUrl) && supabaseAnonKey) {
    const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    })

    // Prefer getClaims (local JWT verify + refresh when asymmetric keys) over getUser (always network).
    const claimsResult = await withTimeout(supabase.auth.getClaims(), AUTH_TIMEOUT_MS)

    if (claimsResult === "timeout") {
      // Protected: fail-closed. Public with cookies: fail-open so the page still loads.
      if (protectedPath) {
        return redirectToLogin(request, pathname)
      }
      return response
    }

    authenticated = Boolean(claimsResult.data?.claims?.sub)
  }

  if (protectedPath && !authenticated) {
    return redirectToLogin(request, pathname)
  }

  return response
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
}
