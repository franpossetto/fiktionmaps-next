"use server"

import * as auth from "@/lib/auth/auth.service"
import type { AuthUser } from "@/lib/auth/auth.types"
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
