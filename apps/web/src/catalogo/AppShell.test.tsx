import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { AppShell } from './AppShell'

vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }))

const mockUseAuth0 = vi.mocked(useAuth0)

const TEMPORADA = { id: 't1', nombre: 'Denboraldia 25-26', estado: 'abierta' as const }
const EQUIPOS = [
  { id: 'e1', nombre: 'Equipo F7', categoria: 'f7', color: '#fff', icono: '⚽', num_miembros_activos: 5 },
]

describe('AppShell', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockUseAuth0.mockReset()
    mockUseAuth0.mockReturnValue({
      getAccessTokenSilently: vi.fn().mockResolvedValue('token'),
      logout: vi.fn(),
    } as unknown as ReturnType<typeof useAuth0>)

    fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/auth/me')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ id: 'u1', email: 'a@b.com', rol: 'entrenador', nombre_visible: 'Ana' }),
        })
      }
      if (url.includes('/catalogo/temporadas') && !url.includes('equipos')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => [TEMPORADA] })
      }
      if (url.includes('/equipos')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => EQUIPOS })
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => [] })
    })
    global.fetch = fetchMock as unknown as typeof fetch
  })

  it('shows only the categories present in the equipos visible to the user', async () => {
    render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByText('Equipo F7')).toBeTruthy())
    expect(screen.getByRole('button', { name: 'f7' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'f11' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'eskola' })).toBeNull()
  })

  it('language toggle calls PATCH /auth/me/idioma with the selected language', async () => {
    render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByText('Equipo F7')).toBeTruthy())

    fetchMock.mockClear()
    fetchMock.mockImplementation((_url: string, options?: RequestInit) => {
      if (options?.method === 'PATCH') {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({}) })
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => [] })
    })

    fireEvent.change(screen.getByDisplayValue('EU'), { target: { value: 'es' } })

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/auth/me/idioma'),
        expect.objectContaining({ method: 'PATCH' }),
      ),
    )
    const call = fetchMock.mock.calls.find((c: unknown[]) => (c[0] as string).includes('/auth/me/idioma'))!
    expect(JSON.parse((call[1] as RequestInit).body as string)).toEqual({ idioma: 'es' })
  })

  it('shows a "cerrada" badge for closed temporadas in the selector and allows selecting them', async () => {
    const temporadaCerrada = { id: 't2', nombre: 'Denboraldia 24-25', estado: 'cerrada' as const }
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/auth/me')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ id: 'u1', email: 'a@b.com', rol: 'entrenador', nombre_visible: 'Ana' }),
        })
      }
      if (url.includes('/catalogo/temporadas') && !url.includes('equipos')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => [temporadaCerrada] })
      }
      if (url.includes('/equipos')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => EQUIPOS })
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => [] })
    })

    render(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByText('Denboraldia 24-25 (itxita)')).toBeTruthy())

    fireEvent.change(screen.getByDisplayValue('Aukeratu denboraldia'), { target: { value: 't2' } })

    await waitFor(() => expect(screen.getByText('Equipo F7')).toBeTruthy())
  })
})
