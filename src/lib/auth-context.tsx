import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, getToken, onUnauthorized, setToken } from './api-client'
import type { User } from '../types/api'

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  // Finishes a Google sign-in: stores the API's JWT and loads the user it
  // belongs to. Rejects (and keeps nothing stored) if the token is not accepted.
  completeLogin: (token: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  // Only "loading" if there's a stored token to verify with /auth/me.
  const [isLoading, setIsLoading] = useState(() => getToken() !== null)
  const queryClient = useQueryClient()

  // Ends the session and wipes cached server data, so the next person to
  // sign in on this browser never sees the previous user's records.
  const endSession = useCallback(() => {
    setToken(null)
    setUser(null)
    queryClient.clear()
  }, [queryClient])

  useEffect(() => {
    onUnauthorized(endSession)
    return () => onUnauthorized(null)
  }, [endSession])

  useEffect(() => {
    if (getToken() === null) return
    api
      .get<User>('/auth/me')
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setIsLoading(false))
  }, [])

  async function completeLogin(token: string) {
    setToken(token)
    try {
      setUser(await api.get<User>('/auth/me'))
    } catch (error) {
      setToken(null)
      throw error
    }
  }

  function logout() {
    endSession()
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, completeLogin, logout }}>{children}</AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
