import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProtectedRoute } from './ProtectedRoute'
import { useAuth } from './useAuth'

vi.mock('./useAuth', () => ({ useAuth: vi.fn() }))

const mockUseAuth = vi.mocked(useAuth)

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
  })

  it('redirects to login when not authenticated', () => {
    const login = vi.fn()
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      user: undefined,
      login,
      logout: vi.fn(),
    })

    render(
      <ProtectedRoute>
        <p>secret</p>
      </ProtectedRoute>,
    )

    expect(login).toHaveBeenCalled()
    expect(screen.queryByText('secret')).toBeNull()
  })

  it('renders children when authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'auth0|1', email: 'a@b.com', rol: 'admin' },
      login: vi.fn(),
      logout: vi.fn(),
    })

    render(
      <ProtectedRoute>
        <p>secret</p>
      </ProtectedRoute>,
    )

    expect(screen.queryByText('secret')).not.toBeNull()
  })
})
