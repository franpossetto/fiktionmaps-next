import { createClient } from "@/lib/supabase/server"
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
import { accessTokenHasRecoveryAmr } from "./recovery-session"

export async function signIn(credentials: SignInCredentials): Promise<AuthResult<AuthUser>> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword(credentials)

  if (error) return { data: null, error: error.message }
  if (!data.user) return { data: null, error: "No user returned" }

  const meta = data.user.user_metadata
  const display_name = (meta?.display_name as string | undefined) ?? null
  const full_name = (meta?.full_name as string | undefined) ?? null
  return {
    data: {
      id: data.user.id,
      email: data.user.email ?? "",
      display_name: display_name || full_name,
      full_name: full_name ?? null,
    },
    error: null,
  }
}

export async function signUp(credentials: SignUpCredentials): Promise<AuthResult<AuthUser>> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: credentials.email,
    password: credentials.password,
    options: {
      data:
        credentials.full_name
          ? {
              full_name: credentials.full_name,
              display_name: credentials.full_name,
            }
          : undefined,
    },
  })

  if (error) return { data: null, error: error.message }
  if (!data.user) return { data: null, error: "No user returned" }

  // If email confirmation is required, Supabase creates the user but doesn't start a session.
  // In that case we should NOT log the user in — surface a clear message instead.
  if (!data.session) {
    return {
      data: null,
      error: "We created your account! Check your email to verify it before logging in.",
    }
  }

  const meta = data.user.user_metadata
  const display_name = (meta?.display_name as string | undefined) ?? null
  const full_name = (meta?.full_name as string | undefined) ?? null
  return {
    data: {
      id: data.user.id,
      email: data.user.email ?? "",
      display_name: display_name || full_name,
      full_name: full_name ?? null,
    },
    error: null,
  }
}

export async function signOut(): Promise<AuthResult> {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  return { data: null, error: error?.message ?? null }
}

export async function getUser(): Promise<AuthResult<AuthUser>> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) return { data: null, error: error?.message ?? null }

  const meta = data.user.user_metadata
  const display_name = (meta?.display_name as string | undefined) ?? null
  const full_name = (meta?.full_name as string | undefined) ?? null
  return {
    data: {
      id: data.user.id,
      email: data.user.email ?? "",
      display_name: display_name || full_name,
      full_name: full_name ?? null,
    },
    error: null,
  }
}

function mapUpdatePasswordError(message: string): AuthPasswordErrorCode {
  const lower = message.toLowerCase()
  if (lower.includes("rate") || lower.includes("too many")) return "RATE_LIMITED"
  if (lower.includes("weak") || lower.includes("easy") || lower.includes("pwned")) {
    return "WEAK_PASSWORD"
  }
  return "UPDATE_FAILED"
}

export async function changePassword(
  input: ChangePasswordInput,
): Promise<AuthResult<void>> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user?.email) {
    return { data: null, error: "UNAUTHORIZED" satisfies AuthPasswordErrorCode }
  }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: input.currentPassword,
  })
  if (reauthError) {
    return {
      data: null,
      error: "INVALID_CURRENT_PASSWORD" satisfies AuthPasswordErrorCode,
    }
  }

  const { error } = await supabase.auth.updateUser({
    password: input.newPassword,
  })
  if (error) {
    return { data: null, error: mapUpdatePasswordError(error.message) }
  }
  return { data: null, error: null }
}

/**
 * Always returns success to the caller for anti-enumeration.
 * Logs Supabase errors server-side only.
 */
export async function requestPasswordReset(
  input: ResetPasswordEmailInput,
): Promise<AuthResult<void>> {
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(input.email, {
    redirectTo: input.redirectTo,
  })
  if (error) {
    console.error("[auth.supabase] resetPasswordForEmail:", error.message)
  }
  return { data: null, error: null }
}

export async function updatePassword(
  input: UpdatePasswordInput,
): Promise<AuthResult<void>> {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { data: null, error: "UNAUTHORIZED" satisfies AuthPasswordErrorCode }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Critical: do not allow a normal logged-in session to use the recovery
  // update path (would change whichever account happens to be in cookies).
  if (!session?.access_token || !accessTokenHasRecoveryAmr(session.access_token)) {
    return {
      data: null,
      error: "NOT_RECOVERY_SESSION" satisfies AuthPasswordErrorCode,
    }
  }

  const { error } = await supabase.auth.updateUser({
    password: input.newPassword,
  })
  if (error) {
    return { data: null, error: mapUpdatePasswordError(error.message) }
  }
  return { data: null, error: null }
}
