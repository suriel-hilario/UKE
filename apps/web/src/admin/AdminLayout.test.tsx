import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { AdminLayout } from './AdminLayout'
import { useAuth } from '../auth/useAuth'

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }))
vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }))

const mockUseAuth = vi.mocked(useAuth)
const mockUseAuth0 = vi.mocked(useAuth0)

describe('AdminLayout', () => {
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

  it('shows the admin-only links and Histórico for admin', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'auth0|1', email: 'a@b.com', rol: 'admin' },
      login: vi.fn(),
      logout: vi.fn(),
    })

    render(
      <MemoryRouter>
        <AdminLayout />
      </MemoryRouter>,
    )

    expect(screen.queryByText('Erabiltzaileak')).not.toBeNull()
    expect(screen.queryByText('Denboraldiak')).not.toBeNull()
    expect(screen.queryByText('Taldeak')).not.toBeNull()
    expect(screen.queryByText('Historikoa')).not.toBeNull()
  })

  it('hides the admin-only links for director, keeps Histórico', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'auth0|2', email: 'd@b.com', rol: 'director' },
      login: vi.fn(),
      logout: vi.fn(),
    })

    render(
      <MemoryRouter>
        <AdminLayout />
      </MemoryRouter>,
    )

    expect(screen.queryByText('Erabiltzaileak')).toBeNull()
    expect(screen.queryByText('Denboraldiak')).toBeNull()
    expect(screen.queryByText('Taldeak')).toBeNull()
    expect(screen.queryByText('Historikoa')).not.toBeNull()
  })
})
