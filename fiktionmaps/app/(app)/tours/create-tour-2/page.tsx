"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { CreateTourWizardV2 } from "@/components/tours/create-tour-wizard-v2"

export default function CreateTour2Page() {
  const router = useRouter()
  const { user, isAuthReady } = useAuth()

  useEffect(() => {
    if (isAuthReady && !user) router.replace("/login")
  }, [user, isAuthReady, router])

  if (!isAuthReady || !user) return null

  return <CreateTourWizardV2 />
}
