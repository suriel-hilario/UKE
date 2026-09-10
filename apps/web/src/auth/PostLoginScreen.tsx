import { useAuth } from './useAuth'

export function PostLoginScreen() {
  const { user, logout } = useAuth()

  return (
    <div>
      <p>Hola {user?.email ?? user?.id}</p>
      <button onClick={() => logout()}>Salir</button>
    </div>
  )
}
