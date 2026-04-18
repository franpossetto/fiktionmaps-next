import * as supabase from "./auth.supabase"
import type { AuthUser, AuthResult, SignInCredentials, SignUpCredentials } from "./auth.types"

export async function signIn(credentials: SignInCredentials): Promise<AuthResult<AuthUser>> {
  if (!credentials.email || !credentials.password) {
    return { data: null, error: "Email and password are required" }
  }
  return supabase.signIn(credentials)
}

export async function signUp(credentials: SignUpCredentials): Promise<AuthResult<AuthUser>> {
  if (!credentials.email || !credentials.password) {
    return { data: null, error: "Email and password are required" }
  }
  return supabase.signUp({
    ...credentials,
    full_name: credentials.full_name ?? null,
  })
}

export async function signOut(): Promise<AuthResult> {
  return supabase.signOut()
}

export async function getAuthenticatedUser(): Promise<AuthResult<AuthUser>> {
  return supabase.getUser()
}

/** Resolves the current user id via `getUser()` (validated with Auth), not from session storage alone. */
export async function getSessionUserId(): Promise<string | null> {
  const result = await supabase.getUser()
  return result.data?.id ?? null
}
