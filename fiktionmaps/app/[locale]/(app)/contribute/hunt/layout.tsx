import type { ReactNode } from "react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/auth/auth.service"
import { getIsUserContributor } from "@/src/users/infrastructure/next/user.queries"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function HuntLayout({ children }: { children: ReactNode }) {
  const userId = await getSessionUserId()
  if (!userId) redirect("/login")

  const isContributor = await getIsUserContributor(userId)
  if (!isContributor) redirect("/map")

  return <>{children}</>
}
