import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'
import { PanelPage } from './PanelPage'

vi.mock('@auth0/auth0-react', () => ({ useAuth0: vi.fn() }))
const mockUseAuth0 = vi.mocked(useAuth0)

const TEMPORADA = { id: 't1', nombre: 'Denboraldia 25-26', estado: 'abierta' as const }

const EQUIPO_PENDIENTE = {
  id: 'e1',
  nombre: 'F7 Pendiente',
  categoria: 'f7' as const,
  asistencia_pendiente: true,
  minutaje_pendiente: false,
  semaforo: 'rojo' as const,
  ultima_actualizacion_asistencia: null,
  ultima_actualizacion_minutaje: null,
}

const EQUIPO_ESKOLA = {
  id: 'e2',
  nombre: 'Eskola Al Dia',
  categoria: 'eskola' as const,
  asistencia_pendiente: false,
  minutaje_pendiente: null,
  semaforo: 'verde' as const,
  ultima_actualizacion_asistencia: '2026-08-01T10:00:00.000Z',
  ultima_actualizacion_minutaje: null,
}

function mockFetch(equipos: unknown[] = [EQUIPO_PENDIENTE, EQUIPO_ESKOLA]) {
  return vi.fn().mockImplementation((url: string) => {
    if (url.includes('/catalogo/temporadas')) {
      return Promise.resolve({ ok: true, status: 200, json: async () => [TEMPORADA] })
    }
    if (url.includes('/panel/estado/')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ sesiones_pendientes: [], jornadas_pendientes: [] }),
      })
    }
    if (url.includes('/panel/estado')) {
      return Promise.resolve({ ok: true, status: 200, json: async () => equipos })
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => [] })
  })
}

describe('PanelPage', () => {
  let fetchMock: ReturnType<typeof mockFetch>

  beforeEach(() => {
    mockUseAuth0.mockReset()
    mockUseAuth0.mockReturnValue({
      getAccessTokenSilently: vi.fn().mockResolvedValue('token'),
    } as unknown as ReturnType<typeof useAuth0>)

    fetchMock = mockFetch()
    global.fetch = fetchMock as unknown as typeof fetch
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('groups cards by categoria and hides categories not present in the response', async () => {
    render(
      <MemoryRouter>
        <PanelPage lang="es" />
      </MemoryRouter>,
    )

    await screen.findByText('F7 Pendiente')
    expect(screen.getByText('Eskola Al Dia')).toBeTruthy()
    expect(screen.queryByText('F11')).toBeNull()
  })

  it('a team with asistencia_pendiente shows the Pendiente chip and a red semaforo', async () => {
    render(
      <MemoryRouter>
        <PanelPage lang="es" />
      </MemoryRouter>,
    )

    await screen.findByText('F7 Pendiente')
    expect(screen.getByLabelText('rojo')).toBeTruthy()
    expect(screen.getByText('⚠️ Pendiente')).toBeTruthy()
  })

  it('eskola team shows — for the minutaje chip', async () => {
    render(
      <MemoryRouter>
        <PanelPage lang="es" />
      </MemoryRouter>,
    )

    await screen.findByText('Eskola Al Dia')
    expect(screen.getByText('—')).toBeTruthy()
  })

  it('clicking a card opens the drawer with the empty state when there are no pending items', async () => {
    render(
      <MemoryRouter>
        <PanelPage lang="es" />
      </MemoryRouter>,
    )

    const card = await screen.findByText('F7 Pendiente')
    fireEvent.click(card.closest('button')!)

    await waitFor(() => expect(screen.getByText('Todo al día')).toBeTruthy())
  })

  it('re-fetches /panel/estado after the refresh interval', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(
      <MemoryRouter>
        <PanelPage lang="es" />
      </MemoryRouter>,
    )

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const callsBefore = fetchMock.mock.calls.filter((c) => (c[0] as string).includes('/panel/estado?')).length

    await vi.advanceTimersByTimeAsync(60000)

    const callsAfter = fetchMock.mock.calls.filter((c) => (c[0] as string).includes('/panel/estado?')).length
    expect(callsAfter).toBeGreaterThan(callsBefore)
  })

  it('shows a "cerrada" badge for closed temporadas in the selector', async () => {
    const temporadaCerrada = { id: 't2', nombre: 'Denboraldia 24-25', estado: 'cerrada' as const }
    fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/catalogo/temporadas')) {
        return Promise.resolve({ ok: true, status: 200, json: async () => [temporadaCerrada] })
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => [] })
    })
    global.fetch = fetchMock as unknown as typeof fetch

    render(
      <MemoryRouter>
        <PanelPage lang="es" />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByText('Denboraldia 24-25 (cerrada)')).toBeTruthy())
  })
})
