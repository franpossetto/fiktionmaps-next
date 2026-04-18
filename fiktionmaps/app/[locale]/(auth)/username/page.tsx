import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { UsernameForm } from "./username-form"

export default async function UsernamePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  return (
    <UsernameForm
      userId={user.id}
      userEmail={user.email ?? ""}
      userName={user.user_metadata?.full_name ?? user.user_metadata?.name ?? null}
    />
  )
}
