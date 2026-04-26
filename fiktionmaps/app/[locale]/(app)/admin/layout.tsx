import type { ReactNode } from "react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSessionUserId } from "@/lib/auth/auth.service"
import { getIsUserAdmin } from "@/src/users/infrastructure/next/user.queries"

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const userId = await getSessionUserId()
  if (!userId) {
    redirect("/login")
  }
  const isAdmin = await getIsUserAdmin(userId)
  if (!isAdmin) {
    redirect("/map")
  }
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col bg-background">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl min-w-0 flex-col px-5">
        {children}
      </div>
    </div>
  )
}
