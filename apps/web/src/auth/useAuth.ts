import { useEffect, useState } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export interface AuthUser {
  id: string
  email?: string
  rol?: string
}

export function useAuth() {
  const {
    isAuthenticated,
    isLoading: isAuth0Loading,
    getAccessTokenSilently,
    loginWithRedirect,
    logout,
  } = useAuth0()
  const [user, setUser] = useState<AuthUser | undefined>(undefined)
  const [isMeLoading, setIsMeLoading] = useState(true)

  useEffect(() => {
    if (isAuth0Loading) return

    if (!isAuthenticated) {
      setUser(undefined)
      setIsMeLoading(false)
      return
    }

    let cancelled = false
    setIsMeLoading(true)

    async function fetchMe() {
      try {
        const token = await getAccessTokenSilently()
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          if (!cancelled) setUser(undefined)
          return
        }
        const data: AuthUser = await res.json()
        if (!cancelled) setUser(data)
      } catch {
        if (!cancelled) setUser(undefined)
      } finally {
        if (!cancelled) setIsMeLoading(false)
      }
    }

    fetchMe()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, isAuth0Loading, getAccessTokenSilently])

  return {
    isAuthenticated,
    isLoading: isAuth0Loading || (isAuthenticated && isMeLoading),
    user,
    login: (returnTo?: string) => loginWithRedirect(returnTo ? { appState: { returnTo } } : undefined),
    logout: () => logout({ logoutParams: { returnTo: window.location.origin } }),
  }
}
