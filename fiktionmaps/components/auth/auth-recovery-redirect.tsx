"use client"

import { useEffect } from "react"
import { useRouter } from "@/i18n/navigation"
import { createClient } from "@/lib/supabase/client"

/**
 * Default Supabase recovery emails often land on Site URL with
 * `#access_token=…&type=recovery`. The server never sees the hash — claim
 * the session in the browser and send the user to set a new password.
 */
export function AuthRecoveryRedirect() {
  const router = useRouter()

  useEffect(() => {
    const hash = window.location.hash
    if (!hash || hash.length < 2) return

    const params = new URLSearchParams(hash.slice(1))
    const type = params.get("type")
    const accessToken = params.get("access_token")
    const refreshToken = params.get("refresh_token")

    if (type !== "recovery" || !accessToken || !refreshToken) return

    let cancelled = false
    const supabase = createClient()

    void (async () => {
      // Avoid leaving a prior account's cookies in place while claiming recovery.
      await supabase.auth.signOut({ scope: "local" })
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      if (cancelled) return
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      )
      if (!error) {
        router.replace("/auth/update-password")
      }
    })()

    return () => {
      cancelled = true
    }
  }, [router])

  return null
}
