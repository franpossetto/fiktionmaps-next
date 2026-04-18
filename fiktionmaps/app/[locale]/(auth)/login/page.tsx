import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AuthPage } from "@/components/auth/auth-page"

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect("/map")

  return <AuthPage />
}
