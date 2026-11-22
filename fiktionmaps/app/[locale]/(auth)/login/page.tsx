import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AuthPage } from "@/components/auth/auth-page"
import { isSafeAppNextPath } from "@/lib/navigation/safe-app-next-path"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { next } = await searchParams
  const afterLogin = next && isSafeAppNextPath(next) ? next : "/map"

  if (user) redirect(afterLogin)

  return <AuthPage afterLogin={afterLogin} />
}
