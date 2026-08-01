import { cache } from "react"
import * as supabase from "./auth.supabase"
import { validateNewPassword } from "./password-rules"
import type {
  AuthUser,
  AuthResult,
  SignInCredentials,
  SignUpCredentials,
  ChangePasswordInput,
  ResetPasswordEmailInput,
  UpdatePasswordInput,
  AuthPasswordErrorCode,
} from "./auth.types"

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

function validateNewPasswordResult(
  newPassword: string,
): AuthResult<void> | null {
  const ruleError = validateNewPassword(newPassword)
  if (!ruleError) return null
  return { data: null, error: ruleError satisfies AuthPasswordErrorCode }
}

export async function changePassword(
  input: ChangePasswordInput,
): Promise<AuthResult<void>> {
  const currentPassword = input.currentPassword
  const newPassword = input.newPassword

  if (!currentPassword) {
    return {
      data: null,
      error: "INVALID_CURRENT_PASSWORD" satisfies AuthPasswordErrorCode,
    }
  }

  const ruleFailure = validateNewPasswordResult(newPassword)
  if (ruleFailure) return ruleFailure

  if (currentPassword === newPassword) {
    return { data: null, error: "SAME_PASSWORD" satisfies AuthPasswordErrorCode }
  }

  return supabase.changePassword({ currentPassword, newPassword })
}

export async function requestPasswordReset(
  input: ResetPasswordEmailInput,
): Promise<AuthResult<void>> {
  const email = input.email.trim()
  if (!email) {
    // Still generic success for anti-enumeration
    return { data: null, error: null }
  }
  return supabase.requestPasswordReset({
    email,
    redirectTo: input.redirectTo,
  })
}

export async function updatePassword(
  input: UpdatePasswordInput,
): Promise<AuthResult<void>> {
  const ruleFailure = validateNewPasswordResult(input.newPassword)
  if (ruleFailure) return ruleFailure
  return supabase.updatePassword({ newPassword: input.newPassword })
}

/** Resolves the current user id via `getUser()` (validated with Auth), not from session storage alone. */
export const getSessionUserId = cache(async (): Promise<string | null> => {
  const result = await supabase.getUser()
  return result.data?.id ?? null
})
