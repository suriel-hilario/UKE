import { PropsWithChildren, useEffect } from 'react'
import { useAuth } from './useAuth'

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { isAuthenticated, isLoading, login } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      login(window.location.pathname + window.location.search)
    }
  }, [isLoading, isAuthenticated, login])

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
