"use client"

import { useEffect } from "react"
import { useRouter } from "@/i18n/navigation"
import { useSearchParams } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { Onboarding } from "@/components/auth/onboarding"

export default function OnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, needsOnboarding } = useAuth()

  const fromProfile = searchParams.get("from") === "profile"

  useEffect(() => {
    if (!user) {
      router.replace("/login")
    } else if (!needsOnboarding) {
      router.replace("/map")
    }
  }, [user, needsOnboarding, router])

  if (!user || !needsOnboarding) return null

  return <Onboarding forceStartAtZero={fromProfile} />
}
