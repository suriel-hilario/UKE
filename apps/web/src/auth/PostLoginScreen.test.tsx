import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PostLoginScreen } from './PostLoginScreen'
import { useAuth } from './useAuth'

vi.mock('./useAuth', () => ({ useAuth: vi.fn() }))

const mockUseAuth = vi.mocked(useAuth)

describe('PostLoginScreen', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
  })

  it('shows a greeting with the user and a logout button that calls logout()', () => {
    const logout = vi.fn()
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      user: { id: 'auth0|1', email: 'a@b.com', rol: 'admin' },
      login: vi.fn(),
      logout,
    })

    render(<PostLoginScreen />)

    expect(screen.queryByText('Hola a@b.com')).not.toBeNull()

    fireEvent.click(screen.getByText('Salir'))
    expect(logout).toHaveBeenCalled()
  })
})
