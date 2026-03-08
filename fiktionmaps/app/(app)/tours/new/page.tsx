"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { ToursWorkbench } from "@/components/tours/tours-workbench"

export default function NewTourPage() {
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    if (!user) router.replace("/login")
  }, [user, router])

  if (!user) return null

  return <ToursWorkbench />
}
