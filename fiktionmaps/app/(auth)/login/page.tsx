"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { AuthPage } from "@/components/auth/auth-page"
import { useEffect } from "react"

export default function LoginPage() {
  const router = useRouter()
  const { user, needsOnboarding } = useAuth()

  useEffect(() => {
    if (user && needsOnboarding) {
      router.replace("/onboarding")
    } else if (user) {
      router.replace("/map")
    }
  }, [user, needsOnboarding, router])

  if (user) return null

  return <AuthPage onBrowseMap={() => router.push("/map")} />
}
