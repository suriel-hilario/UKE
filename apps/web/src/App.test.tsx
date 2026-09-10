import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import { useAuth } from './auth/useAuth'

vi.mock('./auth/useAuth', () => ({ useAuth: vi.fn() }))
vi.mock('./admin/users/UsersPage', () => ({ UsersPage: () => <p>usuarios-page</p> }))
vi.mock('./admin/temporadas/TemporadasPage', () => ({ TemporadasPage: () => <p>temporadas-page</p> }))
vi.mock('./admin/equipos/EquiposPage', () => ({ EquiposPage: () => <p>equipos-page</p> }))
vi.mock('./admin/historico/HistoricoPage', () => ({ HistoricoPage: () => <p>historico-page</p> }))

const mockUseAuth = vi.mocked(useAuth)

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
