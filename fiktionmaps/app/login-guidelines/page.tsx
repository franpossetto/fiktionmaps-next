"use client"

import { useRouter } from "next/navigation"
import { AuthPageGuidelines } from "@/components/auth/auth-page-guidelines"

export default function LoginGuidelinesPage() {
  const router = useRouter()

  return <AuthPageGuidelines onBrowseMap={() => router.push("/map")} />
}
