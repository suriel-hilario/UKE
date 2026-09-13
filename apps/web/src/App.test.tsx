import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import App from './App'
import { useAuth } from './auth/useAuth'

vi.mock('./auth/useAuth', () => ({ useAuth: vi.fn() }))
vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }))
vi.mock('./admin/users/UsersPage', () => ({ UsersPage: () => <p>usuarios-page</p> }))
vi.mock('./admin/temporadas/TemporadasPage', () => ({ TemporadasPage: () => <p>temporadas-page</p> }))
vi.mock('./admin/equipos/EquiposPage', () => ({ EquiposPage: () => <p>equipos-page</p> }))
vi.mock('./admin/historico/HistoricoPage', () => ({ HistoricoPage: () => <p>historico-page</p> }))

const mockUseAuth = vi.mocked(useAuth)
const mockUseAuth0 = vi.mocked(useAuth0)

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('App /admin routing', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
    mockUseAuth0.mockReset()
    mockUseAuth0.mockReturnValue({
      getAccessTokenSilently: vi.fn().mockResolvedValue('token'),
    } as unknown as ReturnType<typeof useAuth0>)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ idioma: 'eu' }),
    }) as unknown as typeof fetch
  })

  it('director can reach /admin/historico', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'auth0|1', email: 'd@b.com', rol: 'director' },
      login: vi.fn(),
      logout: vi.fn(),
    })

    renderAt('/admin/historico')

    expect(screen.queryByText('historico-page')).not.toBeNull()
  })

  it('director is blocked from /admin/usuarios', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'auth0|1', email: 'd@b.com', rol: 'director' },
      login: vi.fn(),
      logout: vi.fn(),
    })

    renderAt('/admin/usuarios')

    expect(screen.queryByText('Sin permiso / Baimenik ez')).not.toBeNull()
    expect(screen.queryByText('usuarios-page')).toBeNull()
  })

  it('admin can still reach every /admin child route', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'auth0|2', email: 'a@b.com', rol: 'admin' },
      login: vi.fn(),
      logout: vi.fn(),
    })

    renderAt('/admin/usuarios')
    expect(screen.queryByText('usuarios-page')).not.toBeNull()
  })
})
