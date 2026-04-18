"use client"

import React, { createContext, useContext, useState, useCallback, useEffect } from "react"
import {
  signInAction,
  signUpAction,
  signOutAction,
  getAuthenticatedUserAction,
} from "@/lib/actions/auth/auth.actions"
import {
  getCurrentUserProfileAction,
  completeOnboardingAction,
} from "@/src/users/infrastructure/next/user.actions"

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
}

export interface UserPreferences {
  genres: string[]
  fictions: string[]
  interests: string[]
  cities: string[]
  avatar?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthReady: boolean
  needsOnboarding: boolean
  preferences: UserPreferences | null
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
  completeOnboarding: (prefs: UserPreferences) => Promise<void>
}

function authUserToUser(
  data: {
    id: string
    email: string
    display_name?: string | null
    full_name?: string | null
  },
  name?: string
): User {
  const displayName =
    name ?? data.display_name ?? data.full_name ?? data.email.split("@")[0] ?? ""
  return {
    id: data.id,
    email: data.email,
    name: displayName,
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthReady, setIsAuthReady] = useState(false)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)

  useEffect(() => {
    let cancelled = false
    async function init() {
      const authResult = await getAuthenticatedUserAction()
      if (cancelled) return
      if (authResult.data) {
        setUser(authUserToUser(authResult.data))
        const profileResult = await getCurrentUserProfileAction()
        if (cancelled) return
        setNeedsOnboarding(profileResult.data ? !profileResult.data.onboardingCompleted : true)
      }
      setIsAuthReady(true)
    }
    init()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const result = await signInAction(email, password)
      if (result.error) throw new Error(result.error)
      if (result.data) {
        setUser(authUserToUser(result.data))
        const profileResult = await getCurrentUserProfileAction()
        setNeedsOnboarding(profileResult.data ? !profileResult.data.onboardingCompleted : true)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const signup = useCallback(async (email: string, password: string, name: string) => {
    setIsLoading(true)
    try {
      const result = await signUpAction(email, password, name.trim() || null)
      if (result.error) throw new Error(result.error)
      if (result.data) {
        setUser(authUserToUser(result.data, name.trim() || undefined))
        setNeedsOnboarding(true)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    await signOutAction()
    setUser(null)
    setNeedsOnboarding(false)
    setPreferences(null)
    window.location.href = "/login"
  }, [])

  const completeOnboarding = useCallback(async (prefs: UserPreferences) => {
    const result = await completeOnboardingAction({
      avatar: prefs.avatar,
      interests: prefs.interests,
      fictions: prefs.fictions,
    })
    if (result.error) throw new Error(result.error)
    setPreferences(prefs)
    setNeedsOnboarding(false)
    if (prefs.avatar) {
      setUser((current) =>
        current ? { ...current, avatar: prefs.avatar } : current
      )
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthReady,
        needsOnboarding,
        preferences,
        login,
        signup,
        logout,
        completeOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
