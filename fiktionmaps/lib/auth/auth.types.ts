export interface AuthUser {
  id: string
  email: string
  /** From auth.users raw_user_meta_data.display_name (preferred for UI) */
  display_name?: string | null
  /** From auth.users raw_user_meta_data.full_name (fallback) */
  full_name?: string | null
}

export interface SignInCredentials {
  email: string
  password: string
}

export interface SignUpCredentials {
  email: string
  password: string
  /** Display name; stored in auth user_metadata and profiles.username */
  full_name?: string | null
}

export interface AuthResult<T = void> {
  data: T | null
  error: string | null
}
