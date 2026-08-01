import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import type { EmailOtpType } from "@supabase/supabase-js"
import type { Database } from "@/supabase/database.types"
import { routing } from "@/i18n/routing"

const localeList = routing.locales as readonly string[]

function isSafeNextPath(next: string, locale: string): boolean {
  if (!next.startsWith("/") || next.startsWith("//")) return false
  const allowed = `/${locale}/auth/update-password`
  return next === allowed || next.startsWith(`${allowed}?`)
}

function createCookieClient(request: NextRequest, response: NextResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return null

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        )
      },
    },
  })
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ locale: string }> },
) {
  const { locale: rawLocale } = await context.params
  const locale = localeList.includes(rawLocale)
    ? rawLocale
    : routing.defaultLocale

  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const nextParam = searchParams.get("next")
  const next =
    nextParam && isSafeNextPath(nextParam, locale)
      ? nextParam
      : `/${locale}/auth/update-password`

  const fail = () => {
    const loginUrl = new URL(`/${locale}/login`, origin)
    loginUrl.searchParams.set("error", "auth_callback")
    return NextResponse.redirect(loginUrl)
  }

  const redirectUrl = new URL(next, origin)
  const response = NextResponse.redirect(redirectUrl)
  const supabase = createCookieClient(request, response)
  if (!supabase) return fail()

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    })
    if (error) return fail()
    return response
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return fail()
    return response
  }

  return fail()
}
