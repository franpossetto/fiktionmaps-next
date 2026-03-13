"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { ToursWorkbenchStudio } from "@/components/tours/tours-workbench-studio"

export default function NewTourStudioPage() {
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    if (!user) router.replace("/login")
  }, [user, router])

  if (!user) return null

  return <ToursWorkbenchStudio />
}
