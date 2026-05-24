import type { ReactNode } from "react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/auth/auth.service"
import { getIsUserStaff } from "@/src/users/infrastructure/next/user.queries"

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default async function ContributionsLayout({ children }: { children: ReactNode }) {
  const userId = await getSessionUserId()
  if (!userId) {
    redirect("/login")
  }
  const staff = await getIsUserStaff(userId)
  if (!staff) {
    redirect("/map")
  }
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col bg-background">
      {children}
    </div>
  )
}
