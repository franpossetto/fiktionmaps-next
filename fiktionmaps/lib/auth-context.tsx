"use client"

import React, { createContext, useContext, useState, useCallback, useEffect } from "react"

const AUTH_STORAGE_KEY = "fiktions-auth-user"

export interface User {
  id: string
  email: string
  name: string
  avatar?: string
}

export interface UserPreferences {
  genres: string[]
  fictions: string[]
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
  completeOnboarding: (prefs: UserPreferences) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthReady, setIsAuthReady] = useState(false)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(AUTH_STORAGE_KEY) : null
      if (raw) {
        const parsed = JSON.parse(raw) as User
        if (parsed?.id && parsed?.email) setUser(parsed)
      }
    } catch {
      // ignore invalid stored auth
    }
    setIsAuthReady(true)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true)
    try {
      if (!email || !password) throw new Error("Email and password are required")
      await new Promise((resolve) => setTimeout(resolve, 1000))
      const nextUser = {
        id: "user-" + Math.random().toString(36).substr(2, 9),
        email,
        name: email.split("@")[0],
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
      }
      setUser(nextUser)
      if (typeof window !== "undefined") localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser))
      setNeedsOnboarding(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const signup = useCallback(async (email: string, password: string, name: string) => {
    setIsLoading(true)
    try {
      if (!email || !password || !name) throw new Error("All fields are required")
      await new Promise((resolve) => setTimeout(resolve, 1000))
      const nextUser = {
        id: "user-" + Math.random().toString(36).substr(2, 9),
        email,
        name,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
      }
      setUser(nextUser)
      if (typeof window !== "undefined") localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextUser))
      setNeedsOnboarding(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setNeedsOnboarding(false)
    setPreferences(null)
    if (typeof window !== "undefined") {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      window.location.href = "/login"
    }
  }, [])

  const completeOnboarding = useCallback((prefs: UserPreferences) => {
    setPreferences(prefs)
    setNeedsOnboarding(false)
    if (prefs.avatar) {
      setUser((current) => {
        if (!current) return current
        const next = { ...current, avatar: prefs.avatar }
        if (typeof window !== "undefined") localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next))
        return next
      })
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthReady, needsOnboarding, preferences, login, signup, logout, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used within an AuthProvider")
  return context
}
