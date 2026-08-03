"use client"

import {
  createContext,
  use,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { SessionAccount } from "@/src/users/infrastructure/next/user.queries"
import type { ProfileWithOnboarding } from "@/src/users/infrastructure/next/user.mappers"

export type { SessionAccount }

type SettingsAccountContextValue = {
  accountPromise: Promise<SessionAccount>
  savedProfile: ProfileWithOnboarding | null
  setSavedProfile: (profile: ProfileWithOnboarding) => void
}

const SettingsAccountContext = createContext<SettingsAccountContextValue | null>(null)

/**
 * Holds the server read as a promise so each section can suspend on it independently,
 * while locally saved edits stay above the Suspense boundaries.
 */
export function SettingsAccountProvider({
  accountPromise,
  children,
}: {
  accountPromise: Promise<SessionAccount>
  children: ReactNode
}) {
  const [savedProfile, setSavedProfile] = useState<ProfileWithOnboarding | null>(null)

  const value = useMemo<SettingsAccountContextValue>(
    () => ({ accountPromise, savedProfile, setSavedProfile }),
    [accountPromise, savedProfile],
  )

  return (
    <SettingsAccountContext.Provider value={value}>
      {children}
    </SettingsAccountContext.Provider>
  )
}

/** Suspends until the server read resolves. Call it only inside a Suspense boundary. */
export function useSettingsAccount(): {
  email: string | null
  profile: ProfileWithOnboarding | null
  onProfileSaved: (profile: ProfileWithOnboarding) => void
} {
  const context = useContext(SettingsAccountContext)
  if (!context) {
    throw new Error("useSettingsAccount must be used within a SettingsAccountProvider")
  }

  const account = use(context.accountPromise)

  return {
    email: account.email,
    profile: context.savedProfile ?? account.profile,
    onProfileSaved: context.setSavedProfile,
  }
}
