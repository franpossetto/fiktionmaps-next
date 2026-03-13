"use server"

import * as auth from "./auth.service"
import type { AuthUser } from "./auth.types"

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
