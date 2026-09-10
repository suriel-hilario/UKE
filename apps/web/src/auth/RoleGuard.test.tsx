import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RoleGuard } from './RoleGuard'
import { useAuth } from './useAuth'

vi.mock('./useAuth', () => ({ useAuth: vi.fn() }))

const mockUseAuth = vi.mocked(useAuth)

describe('RoleGuard', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
  })

  it('shows "Sin permiso / Baimenik ez" when role is not allowed', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'auth0|1', email: 'a@b.com', rol: 'entrenador' },
      login: vi.fn(),
      logout: vi.fn(),
    })

    render(
      <RoleGuard roles={['admin']}>
        <p>secret</p>
      </RoleGuard>,
    )

    expect(screen.queryByText('Sin permiso / Baimenik ez')).not.toBeNull()
    expect(screen.queryByText('secret')).toBeNull()
  })

  it('renders children when role is allowed', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'auth0|1', email: 'a@b.com', rol: 'admin' },
      login: vi.fn(),
      logout: vi.fn(),
    })

    render(
      <RoleGuard roles={['admin']}>
        <p>secret</p>
      </RoleGuard>,
    )

    expect(screen.queryByText('secret')).not.toBeNull()
  })
})
