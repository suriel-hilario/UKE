import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { ScopeGuard } from './ScopeGuard'

vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }))

const mockUseAuth0 = vi.mocked(useAuth0)

describe('ScopeGuard', () => {
  beforeEach(() => {
    mockUseAuth0.mockReset()
    mockUseAuth0.mockReturnValue({
      getAccessTokenSilently: vi.fn().mockResolvedValue('token'),
    } as unknown as ReturnType<typeof useAuth0>)
  })

  it('shows "Sin acceso" when GET /catalogo/equipos/:id responds 403', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Forbidden' }),
    }) as unknown as typeof fetch

    render(
      <MemoryRouter initialEntries={['/equipos/e1']}>
        <Routes>
          <Route
            path="/equipos/:id"
            element={
              <ScopeGuard>
                <p>secret</p>
              </ScopeGuard>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByText('Sarbiderik ez')).toBeTruthy())
    expect(screen.queryByText('secret')).toBeNull()
  })

  it('renders children when GET /catalogo/equipos/:id responds 200', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'e1', nombre: 'Equipo', categoria: 'f7', miembros: [] }),
    }) as unknown as typeof fetch

    render(
      <MemoryRouter initialEntries={['/equipos/e1']}>
        <Routes>
          <Route
            path="/equipos/:id"
            element={
              <ScopeGuard>
                <p>secret</p>
              </ScopeGuard>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByText('secret')).toBeTruthy())
  })
})
