import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { RoleGuard } from '../auth/RoleGuard'
import { useAuth } from '../auth/useAuth'
import { PanelPage } from './PanelPage'

vi.mock('../auth/useAuth', () => ({ useAuth: vi.fn() }))
vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }))
const mockUseAuth = vi.mocked(useAuth)
const mockUseAuth0 = vi.mocked(useAuth0)

describe('/panel access', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
    mockUseAuth0.mockReset()
    mockUseAuth0.mockReturnValue({
      getAccessTokenSilently: vi.fn().mockResolvedValue('token'),
    } as unknown as ReturnType<typeof useAuth0>)
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] }) as unknown as typeof fetch
  })

  it('blocks an entrenador from seeing the panel content', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'auth0|1', email: 'a@b.com', rol: 'entrenador' },
      login: vi.fn(),
      logout: vi.fn(),
    })

    render(
      <MemoryRouter>
        <RoleGuard roles={['director', 'coordinador']}>
          <PanelPage />
        </RoleGuard>
      </MemoryRouter>,
    )

    expect(screen.queryByText('Sin permiso / Baimenik ez')).not.toBeNull()
    expect(screen.queryByText('Panela')).toBeNull()
  })

  it('allows a director through to the panel content', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'auth0|1', email: 'a@b.com', rol: 'director' },
      login: vi.fn(),
      logout: vi.fn(),
    })

    render(
      <MemoryRouter>
        <RoleGuard roles={['director', 'coordinador']}>
          <PanelPage />
        </RoleGuard>
      </MemoryRouter>,
    )

    expect(screen.queryByText('Sin permiso / Baimenik ez')).toBeNull()
  })
})
