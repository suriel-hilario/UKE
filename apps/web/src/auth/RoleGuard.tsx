import { PropsWithChildren } from 'react'
import { useAuth } from './useAuth'

interface RoleGuardProps extends PropsWithChildren {
  roles: string[]
}

export function RoleGuard({ roles, children }: RoleGuardProps) {
  const { user } = useAuth()

  if (!user?.rol || !roles.includes(user.rol)) {
    return <p>Sin permiso / Baimenik ez</p>
  }

  return <>{children}</>
}
