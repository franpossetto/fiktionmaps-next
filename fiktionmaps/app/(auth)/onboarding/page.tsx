"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Onboarding } from "@/components/auth/onboarding"
import { useEffect } from "react"

export default function OnboardingPage() {
  const router = useRouter()
  const { user, needsOnboarding } = useAuth()

  useEffect(() => {
    if (!user) {
      router.replace("/login")
    } else if (!needsOnboarding) {
      router.replace("/map")
    }
  }, [user, needsOnboarding, router])

  if (!user || !needsOnboarding) return null

  return <Onboarding />
}
