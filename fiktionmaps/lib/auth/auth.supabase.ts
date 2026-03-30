import { createClient } from "@/lib/supabase/server"
import type { AuthUser, AuthResult, SignInCredentials, SignUpCredentials } from "./auth.types"

export async function signIn(credentials: SignInCredentials): Promise<AuthResult<AuthUser>> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword(credentials)

  if (error) return { data: null, error: error.message }
  if (!data.user) return { data: null, error: "No user returned" }

  // Debug: inspect Supabase user metadata to verify display_name/full_name
  // This logs on the server where the auth call runs.
  // eslint-disable-next-line no-console
  console.log("[auth.supabase] signIn user_metadata:", data.user.user_metadata)

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

  // Debug: inspect Supabase user metadata when restoring session
  // eslint-disable-next-line no-console
  console.log("[auth.supabase] getUser user_metadata:", data.user.user_metadata)

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
