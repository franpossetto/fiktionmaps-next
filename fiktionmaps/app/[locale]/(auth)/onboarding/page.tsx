import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getCurrentUserProfileAction } from "@/src/users/infrastructure/next/user.actions"
import { Onboarding } from "@/components/auth/onboarding"

type Props = {
  searchParams: Promise<{ from?: string }>
}

export default async function OnboardingPage({ searchParams }: Props) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const profileResult = await getCurrentUserProfileAction()
  const needsOnboarding = profileResult.data ? !profileResult.data.onboardingCompleted : true

  if (!needsOnboarding) redirect("/map")

  const { from } = await searchParams
  const fromProfile = from === "profile"

  return <Onboarding forceStartAtZero={fromProfile} />
}
