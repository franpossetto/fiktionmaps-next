import createIntlMiddleware from "next-intl/middleware"
import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import type { Database } from "@/supabase/database.types"
import { routing } from "./i18n/routing"

const intlMiddleware = createIntlMiddleware(routing)

const PROTECTED_PATHS = ["/profile", "/settings", "/admin"]

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

export async function middleware(request: NextRequest) {
  const intlResponse = await intlMiddleware(request)
  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    const location = intlResponse.headers.get("location")
    // Avoid next-intl redirecting to /en/undefined or /en/undefinedundefined (see next-intl#2240)
    if (location?.includes("undefined")) {
      const safe = request.nextUrl.clone()
      safe.pathname = `/${routing.defaultLocale}/map`
      return NextResponse.redirect(safe)
    }
    return intlResponse
  }

  const pathname = request.nextUrl.pathname
  const pathWithoutLocale = pathnameWithoutLocale(pathname)

  let response = NextResponse.next({ request })
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  let user: { id: string } | null = null
  if (isValidSupabaseUrl(supabaseUrl) && supabaseAnonKey) {
    const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    })
    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser()
    user = sessionUser
  }

  if (isProtected(pathWithoutLocale) && !user) {
    const loginUrl = request.nextUrl.clone()
    const locale = getLocaleFromPathname(pathname)
    loginUrl.pathname = `/${locale}/login`
    loginUrl.searchParams.set("redirectTo", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
}
