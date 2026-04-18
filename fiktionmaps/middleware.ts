import createIntlMiddleware from "next-intl/middleware"
import { NextResponse, type NextRequest } from "next/server"
import { routing } from "./i18n/routing"

const intlMiddleware = createIntlMiddleware(routing)

/**
 * TEMP: Supabase auth + protected routes removed to debug Vercel
 * `ReferenceError: __dirname is not defined` (likely Edge + @supabase/ssr bundle).
 * Restore session check + PROTECTED_PATHS redirect after confirming.
 */
export async function middleware(request: NextRequest) {
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

  return response
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
}
