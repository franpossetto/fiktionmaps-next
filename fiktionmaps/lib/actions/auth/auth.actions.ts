"use server"

import { headers } from "next/headers"
import * as auth from "@/lib/auth/auth.service"
import type { AuthUser } from "@/lib/auth/auth.types"
import { getSiteUrl } from "@/lib/site"
import { routing } from "@/i18n/routing"
import {
  getCurrentUserProfileAction,
  type ProfileWithOnboarding,
} from "@/src/users/infrastructure/next/user.actions"

export async function signInAction(email: string, password: string) {
  return auth.signIn({ email, password })
}

export async function signUpAction(
  email: string,
  password: string,
  fullName?: string | null
) {
  return auth.signUp({ email, password, full_name: fullName ?? null })
}

export async function signOutAction() {
  return auth.signOut()
}

export async function getAuthenticatedUserAction(): Promise<{ data: AuthUser | null; error: string | null }> {
  return auth.getAuthenticatedUser()
}

/** One round-trip for AuthProvider boot (user + profile). */
export async function getSessionBootstrapAction(): Promise<{
  user: AuthUser | null
  profile: ProfileWithOnboarding | null
  error: string | null
}> {
  const authResult = await auth.getAuthenticatedUser()
  if (!authResult.data) {
    return { user: null, profile: null, error: authResult.error }
  }
  const profileResult = await getCurrentUserProfileAction()
  return {
    user: authResult.data,
    profile: profileResult.data,
    error: profileResult.error,
  }
}

function normalizeLocale(locale: string | undefined): string {
  if (locale && (routing.locales as readonly string[]).includes(locale)) {
    return locale
  }
  return routing.defaultLocale
}

/** Prefer the request host (local/preview); fall back to configured site URL. */
async function resolveAuthRedirectOrigin(): Promise<string> {
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")
  if (!host) return getSiteUrl()

  const hostname = host.split(":")[0]?.toLowerCase() ?? ""
  const isLocal =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".vercel.app")

  if (isLocal || process.env.NODE_ENV !== "production") {
    const proto =
      h.get("x-forwarded-proto") ??
      (hostname === "localhost" || hostname === "127.0.0.1" ? "http" : "https")
    return `${proto}://${host}`.replace(/\/+$/, "")
  }

  return getSiteUrl()
}

export async function changePasswordAction(
  currentPassword: string,
  newPassword: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const result = await auth.changePassword({ currentPassword, newPassword })
  if (result.error) return { success: false, error: result.error }
  return { success: true }
}

export async function requestPasswordResetAction(
  email: string,
  locale?: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const loc = normalizeLocale(locale)
  const origin = await resolveAuthRedirectOrigin()
  const redirectTo = `${origin}/${loc}/auth/callback?next=/${loc}/auth/update-password`
  const result = await auth.requestPasswordReset({ email, redirectTo })
  if (result.error) return { success: false, error: result.error }
  return { success: true }
}

export async function updatePasswordAction(
  newPassword: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const result = await auth.updatePassword({ newPassword })
  if (result.error) return { success: false, error: result.error }
  return { success: true }
}
